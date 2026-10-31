/** pose beku; `tegak` = berdiri biasa. Nama klip Blender: pose_<id> */
export const POSES = ['tegak', 'nempel', 'ringkuk', 'duduk', 'tiarap', 'patung', 'pohon', 'menggantung', 'jongkok', 'miring', 'kaget', 'sembah'] as const
export type PoseId = (typeof POSES)[number]

export const POSE_LABEL: Record<PoseId, string> = {
  tegak: 'Tegak',
  nempel: 'Nempel',
  ringkuk: 'Meringkuk',
  duduk: 'Duduk',
  tiarap: 'Tiarap',
  patung: 'Patung',
  pohon: 'Pohon',
  menggantung: 'Lemas',
  jongkok: 'Jongkok',
  miring: 'Miring',
  kaget: 'Melongo',
  sembah: 'Menunduk',
}
