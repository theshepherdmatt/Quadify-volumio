const io = require('socket.io-client');
const EventEmitter = require('events').EventEmitter;

class VolumioListener extends EventEmitter {
    constructor(host = 'http://localhost:3000', refreshrate_ms = 1000) {
        super();
        this.host = host;
        this.refreshrate_ms = refreshrate_ms;
        this.ready = false;
        this.waiting = false;
        this.state = "stop";
        this.formatedMainString = "";
        this.data = {};
        this.watchingIdle = false;
        this.firstRequestConsumed = false;
        this.listen();
        this.idle = false;
        this._idleTimeout = null;
        this.idleTime = 900;
        this.lastSeekEmit = Date.now();
        this.seekThrottleMs = 500; // Throttle seek updates to once every 500ms
    }

    compareData(data) {
        const changes = [];
        for (const d in data) {
            if (this.data[d] === data[d]) continue;
            this.data[d] = data[d];
            changes.push([d, this.data[d]]);
        }
        for (const change of changes) {
            this.processChanges(...change);
        }
    }

    processChanges(key, data) {
        switch (key) {
            case "title":
            case "artist":
            case "album":
                this.formatMainString();
                if (this.formatedMainString !== this.data.formatedMainString) {
                    this.emit("trackChange", this.formatedMainString);
                    this.data.formatedMainString = this.formatedMainString;
                }
                if (this.state === "play") this.resetIdleTimeout();
                break;
            case "status":
                if (this.state !== data) {
                    this.state = data;
                    this.resetIdleTimeout();
                    this.emit("stateChange", data);
                }
                break;
            case "duration":
            case "seek":
                const now = Date.now();
                if (now - this.lastSeekEmit > this.seekThrottleMs) {
                    this.resetIdleTimeout();
                    this.seekFormat();
                    if (this.formatedSeek.seek_string !== this.data.seek_string) {
                        this.emit("seekChange", this.formatedSeek);
                        this.data.seek_string = this.formatedSeek.seek_string;
                        this.lastSeekEmit = now;
                    }
                }
                break;
            case "bitrate":
                this.emit("bitRateChange", data);
                this.emit("line2", `Bit Rate : ${data}`);
                break;
            case "volume":
                this.resetIdleTimeout();
                this.emit("volumeChange", data);
                break;
            case "samplerate":
                this.emit("sampleRateChange", data);
                this.emit("line0", `Sample Rate : ${data}`);
                break;
            case "bitdepth":
                this.emit("sampleDepthChange", data);
                this.emit("line1", `Sample Depth : ${data}`);
                break;
            case "albumart":
                if (data === "/albumart") {
                    const delayedEmit = () => this.emit("coverChange", `${this.host}${data}`);
                    const waitAndEmit = setTimeout(delayedEmit, 5000);
                    const cancelDelayedEmit = () => clearTimeout(waitAndEmit);
                    this.once("coverChange", cancelDelayedEmit);
                    return;
                }
                if (/https?:\/\//.test(data)) {
                    this.emit("coverChange", data);
                    return;
                }
                if (data[0] !== "/") data = `/${data}`;
                this.emit("coverChange", `${this.host}${data}`);
                break;
            case "uri":
                this.emit("file", data);
                break;
            case "channels":
                this.emit("channelsChange", data);
                this.emit("line3", `Channels : ${data}`);
                break;
            case "trackType":
                const pdata = data.replace(/audio/gi, "");
                this.emit("encodingChange", pdata);
                this.emit("line4", `Track Type : ${pdata}`);
                break;
            case "position":
                const position = parseInt(data) + 1;
                this.emit("songIdChange", position);
                const playlistLength = this.data?.playlistlength || 1;
                this.emit("line5", `Playlist : ${position} / ${playlistLength}`);
                break;
            case "repeat":
            case "repeatSingle":
                this.emit("repeatChange", data);
                this.emit("line6", `Repeat : ${data}`);
                break;
        }
    }

    listen() {
        this._socket = io.connect(this.host);
        this.api_caller = setInterval(() => {
            if (this.waiting || this.state !== "play") return;
            this.waiting = true;
            this._socket.emit("getState");
            this._socket.emit("getQueue");
        }, this.refreshrate_ms);

        this._socket.on("pushState", (data) => {
            if (!this.firstRequestConsumed) {
                this.firstRequestConsumed = true;
                this._socket.emit("getState");
                return;
            }
            this.compareData(data);
            this.waiting = false;
        });

        this._socket.on("pushQueue", (resdata) => {
            if (resdata && resdata[0]) {
                const additionnalTrackData = resdata[0], filteredData = {};
                filteredData.playlistlength = resdata.length;
                this.compareData(filteredData);
            }
        });
    }

    seekFormat() {
        let ratiobar,
            seek_string,
            { seek, duration } = this.data;

        try {
            ratiobar = duration ? seek / (duration * 1000) : 0;
        } catch (e) {
            ratiobar = 0;
        }

        try {
            duration = new Date(duration * 1000).toISOString().substr(14, 5);
        } catch (e) {
            duration = "00:00";
        }

        try {
            seek = new Date(seek).toISOString().substr(14, 5);
        } catch (e) {
            seek = "";
        }

        seek_string = `${seek} / ${duration}`;
        this.formatedSeek = { seek_string, ratiobar };
        return this.formatedSeek;
    }

    formatMainString() {
        this.formatedMainString = `${this.data.title}${this.data.artist ? ` - ${this.data.artist}` : ""}${this.data.album ? ` - ${this.data.album}` : ""}`;
    }

    watchIdleState(idleTime) {
        this.watchingIdle = true;
        this.idleTime = idleTime;
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(() => {
            if (!this.watchingIdle) return;
            this.idle = true;
            this.emit("idleStart");
        }, this.idleTime);
    }

    resetIdleTimeout() {
        if (!this.watchingIdle) return;
        if (this.idle) this.emit("idleStop");
        this.idle = false;
        this._idleTimeout.refresh();
    }

    clearIdleTimeout() {
        this.watchingIdle = false;
        if (this.idle) this.emit("idleStop");
        this.idle = false;
        clearTimeout(this._idleTimeout);
    }
}

module.exports = VolumioListener;
