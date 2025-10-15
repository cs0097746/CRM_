export const TYPE_CHOICES = [
  'string', 'text', 'integer', 'float', 'boolean', 'date', 'datetime', 'time', 'file'
];

export const getMediaType = (url: string): 'image' | 'video' | 'pdf' | 'text' | 'unknown' => {
  const cleanUrl = url.split('?')[0];
  const extension = cleanUrl.split('.').pop()?.toLowerCase();
  if (!extension) return 'unknown';

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const pdfExtensions = ['pdf'];
  const textExtensions = ['txt', 'json', 'csv'];

  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (pdfExtensions.includes(extension)) return 'pdf';
  if (textExtensions.includes(extension) || extension.length <= 4) return 'text';
  return 'unknown';
};