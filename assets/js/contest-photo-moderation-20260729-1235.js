(() => {
  const TOKEN_KEY = 'suenos-hotline-admin-token-v3';
  const panel = document.getElementById('contest-photo-moderation');
  const refreshButton = document.getElementById('contest-entry-refresh');
  const entriesPanel = document.getElementById('contest-entries-panel');
  if (!panel || !entriesPanel) return;

  let activeContestId = '';
  let entriesById = new Map();
  let objectUrls = [];

  const token = () => sessionStorage.getItem(TOKEN_KEY) || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const formatSize = bytes => {
    const number = Number(bytes || 0);
    if (!number) return 'Size unavailable';
    if (number < 1024 * 1024) return `${Math.max(1, Math.round(number / 1024))} KB`;
    return `${(number / (1024 * 1024)).toFixed(1)} MB`;
  };
  const statusLabel = value => value === 'approved' ? 'Approved' : value === 'rejected' ? 'Denied' : 'Pending';

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${token()}`,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    if (options.raw) return response;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  };

  const releasePhotoUrls = () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
  };

  const renderPhoto = async image => {
    try {
      const response = await request(`/api/contest-admin-photo?id=${encodeURIComponent(image.dataset.photoId)}`, { raw: true });
      if (!response.ok) throw new Error('Preview unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      image.src = url;
      image.closest('.contest-photo-review-media')?.classList.add('is-loaded');
    } catch {
      image.closest('.contest-photo-review-media')?.classList.add('has-error');
      image.alt = 'Photo preview unavailable';
    }
  };

  const render = entries => {
    const photos = entries
      .filter(entry => entry.photo_asset_key)
      .sort((a, b) => {
        const order = { pending: 0, approved: 1, rejected: 2 };
        return (order[a.gallery_status || 'pending'] - order[b.gallery_status || 'pending']) ||
          (new Date(b.created_at) - new Date(a.created_at));
      });

    entriesById = new Map(photos.map(entry => [entry.id, entry]));
    const pendingCount = photos.filter(entry => (entry.gallery_status || 'pending') === 'pending').length;

    if (!photos.length) {
      panel.innerHTML = '<div class="contest-photo-review-empty"><h3>Photo moderation</h3><p>No photo entries have been submitted yet.</p></div>';
      return;
    }

    panel.innerHTML = `
      <div class="contest-photo-review-heading">
        <div>
          <p class="contest-photo-review-kicker">Photo moderation</p>
          <h3>Review submitted photos</h3>
          <p>See the photo, entrant, public name and caption. Approve publishes it to the gallery. Deny keeps it private.</p>
        </div>
        <div class="contest-photo-review-count"><strong>${pendingCount}</strong><span>pending</span></div>
      </div>
      <div class="contest-photo-review-grid">
        ${photos.map(entry => {
          const galleryStatus = entry.gallery_status || 'pending';
          const fullName = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || 'Unnamed entrant';
          const publicName = entry.public_display_name || 'Not provided';
          const caption = entry.public_caption || entry.memory_text || 'No caption provided.';
          const location = [entry.city, entry.province].filter(Boolean).join(', ') || 'Not provided';
          const submitted = entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Unknown';
          const format = String(entry.photo_mime || 'image').replace('image/', '').toUpperCase();
          return `
            <article class="contest-photo-review-card is-${esc(galleryStatus)}" data-review-card="${esc(entry.id)}">
              <div class="contest-photo-review-media">
                <div class="contest-photo-review-loading">Loading photo…</div>
                <img data-photo-id="${esc(entry.id)}" alt="Submitted contest photo by ${esc(fullName)}">
                <span class="contest-photo-review-badge">${statusLabel(galleryStatus)}</span>
              </div>
              <div class="contest-photo-review-body">
                <h4>${esc(publicName === 'Not provided' ? fullName : publicName)}</h4>
                <dl>
                  <div><dt>Entrant</dt><dd>${esc(fullName)}</dd></div>
                  <div><dt>Public name</dt><dd>${esc(publicName)}</dd></div>
                  <div class="is-caption"><dt>Caption</dt><dd>${esc(caption)}</dd></div>
                  <div><dt>Location</dt><dd>${esc(location)}</dd></div>
                  <div><dt>Submitted</dt><dd>${esc(submitted)}</dd></div>
                  <div><dt>Photo</dt><dd>${esc(format)} · ${esc(formatSize(entry.photo_size))}</dd></div>
                </dl>
                <div class="contest-photo-review-actions">
                  <button class="admin-btn contest-photo-approve" type="button" data-moderation-entry="${esc(entry.id)}" data-moderation-action="approved" ${galleryStatus === 'approved' ? 'disabled' : ''}>${galleryStatus === 'approved' ? 'Approved' : 'Approve'}</button>
                  <button class="admin-btn contest-photo-deny" type="button" data-moderation-entry="${esc(entry.id)}" data-moderation-action="rejected" ${galleryStatus === 'rejected' ? 'disabled' : ''}>${galleryStatus === 'rejected' ? 'Denied' : 'Deny'}</button>
                </div>
                <p class="contest-photo-review-result" aria-live="polite"></p>
              </div>
            </article>`;
        }).join('')}
      </div>`;

    panel.querySelectorAll('img[data-photo-id]').forEach(renderPhoto);
  };

  const load = async () => {
    if (!activeContestId || entriesPanel.hidden) return;
    releasePhotoUrls();
    panel.innerHTML = '<div class="contest-photo-review-loading-panel">Loading photo entries…</div>';
    try {
      const query = encodeURIComponent(document.getElementById('contest-entry-search')?.value?.trim() || '');
      const data = await request(`/api/contest-admin?action=entries&id=${encodeURIComponent(activeContestId)}&q=${query}`);
      render(data.entries || []);
    } catch (error) {
      panel.innerHTML = `<div class="contest-photo-review-empty"><h3>Photo moderation</h3><p>${esc(error.message)}</p></div>`;
    }
  };

  const moderate = async button => {
    const entryId = button.dataset.moderationEntry;
    const galleryStatus = button.dataset.moderationAction;
    const entry = entriesById.get(entryId);
    if (!entry || !['approved', 'rejected'].includes(galleryStatus)) return;

    const card = button.closest('.contest-photo-review-card');
    const result = card?.querySelector('.contest-photo-review-result');
    card?.querySelectorAll('button').forEach(control => { control.disabled = true; });
    if (result) result.textContent = galleryStatus === 'approved' ? 'Publishing photo…' : 'Denying photo…';

    try {
      await request(`/api/contest-admin?action=gallery-moderate&id=${encodeURIComponent(activeContestId)}`, {
        method: 'POST',
        body: JSON.stringify({
          entryId,
          galleryStatus,
          publicCaption: entry.public_caption || entry.memory_text || '',
          publicDisplayName: entry.public_display_name || '',
          publicAltText: `Sunfest contest photo${entry.public_display_name ? ` submitted by ${entry.public_display_name}` : ''}`,
          galleryGroup: 'festival-favourites',
          note: galleryStatus === 'approved' ? 'Approved in photo moderation dashboard.' : 'Denied in photo moderation dashboard.',
        }),
      });
      if (result) result.textContent = galleryStatus === 'approved' ? 'Approved and published.' : 'Denied. The photo remains private.';
      await load();
      refreshButton?.click();
    } catch (error) {
      if (result) result.textContent = error.message;
      card?.querySelectorAll('button').forEach(control => { control.disabled = false; });
    }
  };

  document.addEventListener('click', event => {
    const entriesButton = event.target.closest('[data-entries]');
    if (entriesButton) {
      activeContestId = entriesButton.dataset.entries || '';
      setTimeout(load, 150);
      return;
    }
    const moderationButton = event.target.closest('[data-moderation-entry]');
    if (moderationButton) moderate(moderationButton);
  });

  refreshButton?.addEventListener('click', () => setTimeout(load, 100));
  document.getElementById('contest-entries-close')?.addEventListener('click', releasePhotoUrls);
})();
