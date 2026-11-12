/*
 * Confirmación de asistencia y datos de mesa de regalos con Supabase.
 * Se inyecta en la invitación durante el despliegue; el HTML original no se modifica.
 * Si la URL trae el nombre del invitado (dominio/nombre-del-invitado), el botón
 * "Confirmar asistencia" abre un formulario. Si no, conserva su enlace de WhatsApp.
 */
(function () {
  var cfg = window.BODA_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  var RESERVED = ['', 'index.html', '404.html', 'dashboard'];

  function getSlug() {
    var params = new URLSearchParams(location.search);
    var q = params.get('invitado') || params.get('i');
    if (q) return q.trim().toLowerCase();
    var path = location.pathname;
    var base = (cfg.basePath || '').replace(/\/$/, '');
    if (base && path.indexOf(base) === 0) path = path.slice(base.length);
    var seg = path.split('/').filter(Boolean)[0] || '';
    seg = decodeURIComponent(seg).trim().toLowerCase();
    return RESERVED.indexOf(seg) === -1 ? seg : '';
  }

  function rpc(fn, body) {
    return fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: 'Bearer ' + cfg.supabaseAnonKey
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('Error ' + r.status);
      return r.json();
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Mesa de regalos: datos bancarios configurados en el dashboard ----------
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }

  rpc('get_datos_regalo', {})
    .then(function (rows) {
      var d = rows && rows[0];
      if (!d || !d.clabe) return;
      var modalGifts = document.getElementById('modal-gifts');
      if (!modalGifts) return;
      var anchor = Array.prototype.find.call(modalGifts.querySelectorAll('p strong'), function (el) {
        return /concepto/i.test(el.textContent);
      });
      var box = document.createElement('span');
      box.className = 'gift-bank';
      box.innerHTML =
        (d.banco ? '<strong>Banco:</strong> ' + esc(d.banco) + '<br>' : '') +
        (d.titular ? '<strong>Titular:</strong> ' + esc(d.titular) + '<br>' : '') +
        '<strong>CLABE:</strong> <span style="letter-spacing:.06em">' + esc(d.clabe) + '</span><br>' +
        '<button type="button" class="btn" style="display:inline-block;margin:.8rem auto 0;padding:.5rem 1rem">Copiar CLABE</button><br><br>';
      var btn = box.querySelector('button');
      btn.addEventListener('click', function () {
        copyText(d.clabe).then(function () {
          btn.textContent = 'CLABE copiada';
          setTimeout(function () { btn.textContent = 'Copiar CLABE'; }, 2000);
        });
      });
      if (anchor) anchor.parentNode.insertBefore(box, anchor);
      else modalGifts.querySelector('.modal-content p').appendChild(box);
    })
    .catch(function () {});

  // ---------- Confirmación con la liga personalizada ----------
  // dominio/nombre-del-invitado: al presionar "Confirmar asistencia" se registra
  // en Supabase que ese invitado sí asistirá.
  var slug = getSlug();
  var btn = document.querySelector('a.btn[href*="wa.me"]');
  if (!slug || !btn) return;

  var style = document.createElement('style');
  style.textContent =
    '.rsvp-link{background:none;border:none;color:#666;text-decoration:underline;cursor:pointer;font:inherit;font-size:.8rem;margin-top:1.4rem}' +
    '.rsvp-error{color:#a00}';
  document.head.appendChild(style);

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-rsvp';
  modal.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Cerrar">&times;</button><div class="rsvp-body"></div></div>';
  document.body.appendChild(modal);
  var body = modal.querySelector('.rsvp-body');
  function show(html) { body.innerHTML = html; modal.classList.add('active'); }
  function close() { modal.classList.remove('active'); }
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

  var guestReq = rpc('get_invitado', { p_slug: slug })
    .then(function (rows) { return rows && rows[0] ? rows[0] : null; })
    .catch(function () { return null; });

  var busy = false;
  function responder(guest, asiste) {
    return rpc('responder_invitacion', {
      p_slug: slug, p_asiste: asiste, p_asistentes: asiste ? guest.pases : 0, p_mensaje: null
    });
  }

  function confirmado(guest) {
    show(
      '<h2>¡Gracias, ' + esc(guest.nombre) + '!</h2>' +
      '<p>Tu asistencia quedó confirmada' + (guest.pases > 1 ? ' para ' + guest.pases + ' personas' : '') + '.<br><br>Nos dará mucho gusto verte el 13 de marzo.</p>' +
      '<button class="rsvp-link" type="button">¿Al final no podrás asistir? Avísanos aquí</button>'
    );
    body.querySelector('.rsvp-link').addEventListener('click', function () {
      this.disabled = true;
      responder(guest, false)
        .then(function () { show('<h2>Gracias por avisarnos</h2><p>Lamentamos que no puedas acompañarnos.<br><br>Te tendremos presente en este día.</p>'); })
        .catch(function () { show('<h2>Ups</h2><p class="rsvp-error">No pudimos guardar tu respuesta. Intenta de nuevo en un momento.</p>'); });
    });
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    var waHref = btn.href;
    show('<h2>Un momento…</h2><p>Estamos registrando tu asistencia.</p>');
    guestReq.then(function (guest) {
      if (!guest) {
        // La liga no corresponde a ningún invitado: se usa el WhatsApp original
        close();
        location.href = waHref;
        return;
      }
      return responder(guest, true).then(function () { confirmado(guest); });
    }).catch(function () {
      show('<h2>Ups</h2><p class="rsvp-error">No pudimos registrar tu confirmación. Revisa tu conexión e intenta de nuevo.</p>');
    }).then(function () { busy = false; });
  });
})();
