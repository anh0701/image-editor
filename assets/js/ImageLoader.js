export default class ImageLoader {
  constructor(canvas) {
    if (!canvas) throw new Error("Canvas is required");
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.img = null; 
    this.onLoadCallback = null; // callback khi ảnh được load
  }

  setOnLoadCallback(callback) {
    this.onLoadCallback = callback;
  }

  openImage(event, callback) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // resize canvas theo ảnh
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        // clear + vẽ ảnh
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);

        // callback trả ảnh về CanvasCore
        if (callback) callback(img);
      };
      img.src = ev.target.result;
    };

    reader.readAsDataURL(file);
  }

  enableClipboardPaste() {
    document.addEventListener("paste", (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          const imgPaste = new Image();
          imgPaste.onload = () => {

            if (this.canvas.width < imgPaste.width) this.canvas.width = imgPaste.width;
            if (this.canvas.height < imgPaste.height) this.canvas.height = imgPaste.height;

            const x = (this.canvas.width - imgPaste.width) / 2;
            const y = (this.canvas.height - imgPaste.height) / 2;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(imgPaste, x, y);

            this.img = imgPaste;
            if (this.onLoadCallback) this.onLoadCallback(this.img);

            URL.revokeObjectURL(imgPaste.src);
          };
          imgPaste.src = URL.createObjectURL(blob);
          break;
        }
      }
    });
  }
}
