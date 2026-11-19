// The manifest's SHA-256 covers the final native RGW1 bytes after these edits.
export async function applyWeightEdits(buffer, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load Small 11 weight edits (' + response.status + ')');
  const bytes = new Uint8Array(buffer);
  let previousEnd = 0;
  for (const edit of await response.json()) {
    const patch = atob(edit.bytes);
    if (!Number.isSafeInteger(edit.offset) || edit.offset < previousEnd || edit.offset + patch.length > bytes.length) {
      throw new Error('Invalid Small 11 weight edit');
    }
    for (let i = 0; i < patch.length; i++) bytes[edit.offset + i] = patch.charCodeAt(i);
    previousEnd = edit.offset + patch.length;
  }
}
