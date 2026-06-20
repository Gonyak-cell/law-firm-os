export function createMatterVaultDefaultFolderTemplate({ matter_id } = {}) {
  if (!matter_id) throw new TypeError('matter_id is required');
  return Object.freeze([
    Object.freeze({ name: 'Root', path: '/', matter_id, required: true }),
    Object.freeze({ name: 'Client Materials', path: '/Client Materials', matter_id, required: false }),
    Object.freeze({ name: 'Work Product', path: '/Work Product', matter_id, required: false }),
  ]);
}
