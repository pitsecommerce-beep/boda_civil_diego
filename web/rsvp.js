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

  // ---------- Confirmación personalizada ----------
  var slug = getSlug();
  if (!slug) return;

  var style = document.createElement('style');
  style.textContent =
    '.rsvp-field{margin:1.2rem 0 0;text-align:left;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#666}' +
    '.rsvp-field select,.rsvp-field textarea{display:block;width:100%;margin-top:.4rem;padding:.7rem;border:1px solid #0a0a0a;background:transparent;font-family:Inter,sans-serif;font-weight:300;font-size:.9rem;color:#0a0a0a;letter-spacing:normal;text-transform:none;border-radius:0}' +
    '.rsvp-field textarea{resize:vertical;min-height:70px}' +
    '.rsvp-actions{display:flex;flex-direction:column;gap:.65rem;margin-top:1.4rem}' +
    '.rsvp-actions .btn:disabled{opacity:.5;cursor:wait}' +
    '.rsvp-status{margin-top:1rem;font-size:.85rem;color:#666}' +
    '.rsvp-error{margin-top:1rem;font-size:.85rem;color:#a00}';
  document.head.appendChild(style);

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-rsvp';
  modal.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Cerrar">&times;</button><div class="rsvp-body"></div></div>';
  document.body.appendChild(modal);
  var body = modal.querySelector('.rsvp-body');

  function close() { modal.classList.remove('active'); }
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

  var guest = null;

  function renderForm() {
    var g = guest;
    var options = '';
    for (var n = 1; n <= g.pases; n++) {
      var sel = (g.asistentes || g.pases) === n ? ' selected' : '';
      options += '<option value="' + n + '"' + sel + '>' + n + (n === 1 ? ' persona' : ' personas') + '</option>';
    }
    var previo = '';
    if (g.estado === 'confirmado') previo = '<p class="rsvp-status">Ya confirmaste tu asistencia. Puedes cambiar tu respuesta si lo necesitas.</p>';
    if (g.estado === 'no_asiste') previo = '<p class="rsvp-status">Nos indicaste que no podrás asistir. Puedes cambiar tu respuesta si lo necesitas.</p>';

    body.innerHTML =
      '<h2>' + esc(g.nombre) + '</h2>' +
      '<p>Nos encantaría que nos acompañes el 13 de marzo de 2027.' +
      (g.pases > 1 ? '<br>Tenemos <strong>' + g.pases + ' lugares</strong> reservados para ti.' : '') + '</p>' +
      previo +
      (g.pases > 1 ? '<label class="rsvp-field">¿Cuántos asistirán?<select id="rsvp-n">' + options + '</select></label>' : '') +
      '<label class="rsvp-field">Mensaje para los novios (opcional)<textarea id="rsvp-msg" maxlength="500"></textarea></label>' +
      '<div class="rsvp-actions">' +
      '<button class="btn" data-asiste="1">Sí, asistiré</button>' +
      '<button class="btn" data-asiste="0">No podré asistir</button>' +
      '</div><p class="rsvp-error" hidden></p>';

    body.querySelectorAll('[data-asiste]').forEach(function (b) {
      b.addEventListener('click', function () { submit(b.getAttribute('data-asiste') === '1'); });
    });
  }

  function submit(asiste) {
    var btns = body.querySelectorAll('[data-asiste]');
    btns.forEach(function (b) { b.disabled = true; });
    var nEl = body.querySelector('#rsvp-n');
    var n = nEl ? parseInt(nEl.value, 10) : 1;
    var msg = body.querySelector('#rsvp-msg').value;
    rpc('responder_invitacion', { p_slug: slug, p_asiste: asiste, p_asistentes: n, p_mensaje: msg })
      .then(function () {
        guest.estado = asiste ? 'confirmado' : 'no_asiste';
        guest.asistentes = asiste ? n : 0;
        body.innerHTML = asiste
          ? '<h2>¡Gracias!</h2><p>Tu asistencia quedó confirmada' + (n > 1 ? ' para ' + n + ' personas' : '') + '.<br><br>Nos dará mucho gusto verte.</p>'
          : '<h2>Gracias por avisarnos</h2><p>Lamentamos que no puedas acompañarnos.<br><br>Te tendremos presente en este día.</p>';
      })
      .catch(function () {
        btns.forEach(function (b) { b.disabled = false; });
        var err = body.querySelector('.rsvp-error');
        err.textContent = 'No pudimos guardar tu respuesta. Intenta de nuevo en un momento.';
        err.hidden = false;
      });
  }

  rpc('get_invitado', { p_slug: slug })
    .then(function (rows) {
      if (!rows || !rows.length) return;
      guest = rows[0];
      var btn = document.querySelector('a.btn[href*="wa.me"]');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        renderForm();
        modal.classList.add('active');
      });
    })
    .catch(function () { /* sin conexión: se mantiene el enlace de WhatsApp */ });
})();
