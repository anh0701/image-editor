export class HistoryManager {
    constructor(maxSize = 100) {
        this.history = [];
        this.index = -1;
        this.maxSize = maxSize;
    }

    static clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    push(state) {
        const snapshot = HistoryManager.clone(state);
        if (this.index < this.history.length - 1) {
            this.history = this.history.slice(0, this.index + 1);
        }
        this.history.push(snapshot);
        if (this.history.length > this.maxSize) {
            this.history.shift();
        } else {
            this.index++;
        }
    }

    undo() {
        if (this.index <= 0) return null;
        this.index--;
        return HistoryManager.clone(this.history[this.index]);
    }

    redo() {
        if (this.index >= this.history.length - 1) return null;
        this.index++;
        return HistoryManager.clone(this.history[this.index]);
    }

    current() {
        if (this.index < 0) return null;
        return HistoryManager.clone(this.history[this.index]);
    }
}
