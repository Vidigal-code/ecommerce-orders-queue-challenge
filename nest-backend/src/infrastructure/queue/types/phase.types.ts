export type Phase =
  | 'IDLE'
  | 'GENERATING'
  | 'ENQUEUE_VIP'
  | 'WAITING_VIP_DRAIN'
  | 'ENQUEUE_NORMAL'
  | 'WAITING_NORMAL_DRAIN'
  | 'DONE'
  | 'ABORTED'
  | 'ERROR';
