// Server-authoritative drawing history per room with global undo/redo
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);


export class DrawingState {
constructor() {
// An ordered list of operations (draw/erase) with tombstones for undo.
this.ops = []; // [{ id, userId, type, tool, color, size, points, ts, composite, undone: bool }]
}


snapshot() {
// Return ops that are not undone in order.
return this.ops.filter(o => !o.undone);
}


addOperation(op) {
const rec = {
id: nanoid(),
ts: Date.now(),
composite: op.tool === 'eraser' ? 'destination-out' : 'source-over',
undone: false,
...op
};
this.ops.push(rec);
return rec;
}


globalUndo() {
for (let i = this.ops.length - 1; i >= 0; i--) {
if (!this.ops[i].undone) {
this.ops[i].undone = true;
return { id: this.ops[i].id };
}
}
return null; // nothing to undo
}


globalRedo() {
for (let i = 0; i < this.ops.length; i++) {
if (this.ops[i].undone) {
this.ops[i].undone = false;
return { id: this.ops[i].id };
}
}
return null; // nothing to redo
}
}