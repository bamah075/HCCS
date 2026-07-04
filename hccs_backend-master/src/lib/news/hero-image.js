// Shared helpers for /api/news create + update.
//
// `mirrorRemoteImage` exists because many external news/image hosts (Magzter,
// some Straits Times CDNs, etc.) block hotlinking via Referer checks — the URL
// works in the editor's preview tab but renders blank on hccs.sg. Re-uploading
// the bytes to HCCS Supabase Storage eliminates that whole class of breakage.

export function slugify(s) {
    return String(s || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'untitled';
}

function supabaseHost() {
    return (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
}

function isAlreadyInternal(url) {
    if (!url) return false;
    const host = supabaseHost();
    if (!host) return false;
    return url.includes(host);
}

export async function uploadHeroFile(supabase, file, titleHint) {
    if (!file || typeof file === 'string' || !file.size) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.type?.split('/')[1] || 'jpeg').replace(/[^a-z0-9]/g, '');
    const path = `news/${slugify(titleHint)}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('images').upload(path, buf, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
    });
    if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data?.publicUrl ?? null;
}

// Returns either the new internal Supabase URL or — if mirroring fails — the
// original remote URL, so a transient fetch failure never blocks a save.
export async function mirrorRemoteImage(supabase, remoteUrl, titleHint) {
    if (!remoteUrl) return null;
    if (isAlreadyInternal(remoteUrl)) return remoteUrl;
    try {
        const res = await fetch(remoteUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; HCCS-Admin/1.0)',
                Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
            },
            redirect: 'follow',
        });
        if (!res.ok) return remoteUrl;
        const contentType = (res.headers.get('content-type') || '').split(';')[0].trim() || 'image/jpeg';
        if (!contentType.startsWith('image/')) return remoteUrl;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) return remoteUrl;
        const ext = (contentType.split('/')[1] || 'jpeg').replace(/[^a-z0-9]/g, '').slice(0, 5);
        const path = `news/${slugify(titleHint)}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('images').upload(path, buf, {
            contentType,
            upsert: true,
        });
        if (upErr) return remoteUrl;
        const { data } = supabase.storage.from('images').getPublicUrl(path);
        return data?.publicUrl ?? remoteUrl;
    } catch {
        return remoteUrl;
    }
}

