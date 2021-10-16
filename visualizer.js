window.onload = () => {
    var TIMING_TARGET = 1000;

    function LightenDarkenColor(col, amt) {
        var usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }

        var num = parseInt(col, 16);

        var r = (num >> 16) + amt;

        if (r > 255) r = 255;
        else if (r < 0) r = 0;

        var b = ((num >> 8) & 0x00FF) + amt;

        if (b > 255) b = 255;
        else if (b < 0) b = 0;

        var g = (num & 0x0000FF) + amt;

        if (g > 255) g = 255;
        else if (g < 0) g = 0;

        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }

    class Visualizer {
        constructor(options) {
            this.options = options;
            this.visualizer = document.createElement("canvas");
            this.drawContext = this.visualizer.getContext("2d");
            this.blips = [];
        }

        create() {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.beginPath();
                if (r < 1) {
                    this.rect(x, y, w, h);
                } else {
                    if (window["opera"]) {
                        this.moveTo(x + r, y);
                        this.arcTo(x + r, y, x, y + r, r);
                        this.lineTo(x, y + h - r);
                        this.arcTo(x, y + h - r, x + r, y + h, r);
                        this.lineTo(x + w - r, y + h);
                        this.arcTo(x + w - r, y + h, x + w, y + h - r, r);
                        this.lineTo(x + w, y + r);
                        this.arcTo(x + w, y + r, x + w - r, y, r);
                    } else {
                        this.moveTo(x + r, y);
                        this.arcTo(x + w, y, x + w, y + h, r);
                        this.arcTo(x + w, y + h, x, y + h, r);
                        this.arcTo(x, y + h, x, y, r);
                        this.arcTo(x, y, x + w, y, r);
                    }
                }
                this.closePath();
            };
            /** @expose */
            CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, w, h, r) {
                this.roundRect(x, y, w, h, r);
                this.fill();
            };

            this.visualizer.height = 400;
            this.visualizer.width = 1350;
            this.visualizer.style.marginLeft = "3%";
            this.visualizer.style.marginTop = "-4.6%";
            var ctx = this.visualizer.getContext("2d");
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, this.visualizer.width, this.visualizer.height);
            document.body.appendChild(this.visualizer);
            var render = () => {
                ctx.clearRect(0, 0, this.visualizer.width, this.visualizer.height);
                var now = Date.now();
                var later = Date.now() + this.options.interval;
                var interval = later - now;
                var remove = [];
                ctx.beginPath();
                for (var i = 0; i < this.blips.length; i++) {
                    ctx.fillStyle = this.blips[i].color;
                    let y = this.visualizer.height - (((now - this.blips[i].time) / interval) * this.visualizer.height);
                    let duration;
                    if (this.blips[i].endTime !== undefined) {
                        duration = this.blips[i].endTime - this.blips[i].time;
                        if (this.blips[i].endTime < now - interval) {
                            remove.push(this.blips[i])
                        }
                    } else duration = interval;
                    let height = (duration / interval) * this.visualizer.height;
                    ctx.fillRoundRect(this.blips[i].x, y, this.blips[i].width - 5, height, 7)
                }
                ctx.fill();
                for (var i = 0; i < remove.length; i++) {
                    this.blips.splice(this.blips.indexOf(remove[i]), 1);
                }
                requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
        }



        addNote(noteName, time, color) {
            if (this.options["different colors per track"] == true) {
                if (noteName == undefined || time == undefined || color == undefined || MPP.piano.keys[noteName].rect.w == undefined) return;
                let keyPosX = MPP.piano.keys[noteName].rect.x;
                if (noteName.includes("s")) {
                    let c = new Color(color);
                    c.r -= 40
                    c.g -= 40
                    c.b -= 40
                    this.blips.push({
                        noteName: noteName,
                        x: keyPosX,
                        time: time,
                        color: c.toHexa(),
                        width: MPP.piano.keys[noteName].rect.w
                    });
                } else {
                    this.blips.push({
                        noteName: noteName,
                        x: keyPosX,
                        time: time,
                        color: color,
                        width: MPP.piano.keys[noteName].rect.w
                    });
                }
            } else {
                if (noteName == undefined || time == undefined || color == undefined || MPP.piano.keys[noteName].rect.w == undefined) return;
                let keyPosX = MPP.piano.keys[noteName].rect.x;
                if (noteName.includes("s")) color = LightenDarkenColor(color, -40);
                this.blips.push({
                    noteName: noteName,
                    x: keyPosX,
                    time: time,
                    color: color,
                    width: MPP.piano.keys[noteName].rect.w
                });
            }
        }

        stopNote(noteName, time) {
            for (var i = 0; i < this.blips.length; i++) {
                if (this.blips[i].noteName == noteName && this.blips[i].endTime == undefined) {
                    this.blips[i].endTime = time;
                }
            }
        }

        others(msg) {
            if (this.options["see other player notes"] == true) {
                var t = msg.t - MPP.client.serverTimeOffset + TIMING_TARGET - Date.now();
                for (var i = 0; i < msg.n.length; i++) {
                    var note = msg.n[i];
                    var ms = t + (note.d || 0);
                    if (ms < 0) {
                        ms = 0;
                    } else if (ms > 10000) continue;
                    if (note.s) {
                        if (vis !== null || typeof(vis) !== "undefined") {
                            this.stopNote(note.n, Date.now() + ms);
                        }
                    } else {
                        if (vis !== null || typeof(vis) !== "undefined") {
                            this.addNote(note.n, Date.now() + ms, MPP.client.ppl[msg.p].color);
                        }
                    }
                }
            }
        }

        remove() {
            if (vis || typeof(vis) !== "undefined")
                vis = null;
        }
    }

    var vis = new Visualizer({
        "different colors per track": false,
        "see other player notes": true,
        interval: 2000
    });
    vis.create();

    MPP.press = (note, vel, color) => {
        MPP.piano.play(note, vel, MPP.client.getOwnParticipant(), 0);
        MPP.client.startNote(note, vel);
        if (vis !== null || typeof(vis) !== "undefined") {
            vis.addNote(note, Date.now(), MPP.client.getOwnParticipant().color);
        }
    };

    MPP.release = (note) => {
        MPP.piano.stop(note, MPP.client.getOwnParticipant(), 0);
        MPP.client.stopNote(note);
        if (vis !== null || typeof(vis) !== "undefined") {
            vis.stopNote(note, Date.now());
        }
    };

    MPP.client.on("n", (msg) => {
        vis.others(msg);
    });
}