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

  openImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.img = new Image();
      this.img.onload = () => {

        this.canvas.width = this.img.width;
        this.canvas.height = this.img.height;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.img, 0, 0);

        if (this.onLoadCallback) this.onLoadCallback(this.img);
      };
      this.img.src = ev.target.result;
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
