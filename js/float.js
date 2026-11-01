// Floating views.
// Desktop Chrome and Edge: Document Picture-in-Picture, a real always-on-top
// mini window that holds live, tappable page content.
// Elsewhere (Safari, iPhone): a picture-in-picture video of the face, drawn
// into a canvas and streamed. It floats over other apps but can't be tapped,
// and iOS may freeze it while the app is in the background.

export const canFloatWindow = () => 'documentPictureInPicture' in window;

export function canFloatVideo() {
  const v = document.createElement('video');
  return !!(document.pictureInPictureEnabled || typeof v.webkitSetPresentationMode === 'function')
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

// Opens the mini window and returns its document; `onClose` runs when it closes.
export async function openFloatWindow(width, height, onClose) {
  const win = await window.documentPictureInPicture.requestWindow({ width, height });
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const copy = win.document.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = link.href;
    win.document.head.append(copy);
  }
  const meta = win.document.createElement('meta');
  meta.name = 'color-scheme';
  meta.content = 'light dark';
  win.document.head.append(meta);
  win.addEventListener('pagehide', onClose, { once: true });
  return win;
}

// Streams `canvas` into a hidden video and asks for picture-in-picture.
export async function openFloatVideo(canvas, onClose) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.className = 'pip-video';
  video.srcObject = canvas.captureStream(4);
  document.body.append(video);
  await video.play();
  const cleanup = () => { video.srcObject = null; video.remove(); onClose(); };
  if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
    video.addEventListener('leavepictureinpicture', cleanup, { once: true });
    await video.requestPictureInPicture();
  } else {
    video.addEventListener('webkitpresentationmodechanged', () => {
      if (video.webkitPresentationMode !== 'picture-in-picture') cleanup();
    });
    video.webkitSetPresentationMode('picture-in-picture');
  }
  return () => {
    if (document.pictureInPictureElement === video) document.exitPictureInPicture();
    else if (video.webkitPresentationMode === 'picture-in-picture') video.webkitSetPresentationMode('inline');
    else cleanup();
  };
}
