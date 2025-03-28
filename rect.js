class Rect {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    toString() {
        return `(${this.width}x${this.height}+${this.x}+${this.y})`;
    }
}

export default Rect;