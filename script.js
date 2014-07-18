Incoming = {
    initPage: function () {
        document.getElementById('regionChooser').onsubmit = Incoming.onSubmit;

        window.onhashchange = Incoming.onHashChange;
        if (window.location.hash) {
            window.onhashchange();
        }

        document.getElementById('faq-header').addEventListener('click', Incoming.toggleOpen);
    },
    establishConnectionToRegion: function (region) {
        if (Incoming.currentConnection) {
            Incoming.currentConnection.close();
        }
        Incoming.currentConnection = new Incoming.RocketAlert(region);
    },
    onHashChange: function () {
        var regionNumber = window.location.hash.replace('#', '');
        Incoming.establishConnectionToRegion(regionNumber);
        document.getElementById('region').value = regionNumber;
    },
    onSubmit: function () {
        var regionValue = document.forms.regionChooser.region.value;
        window.location.hash = regionValue;
        Incoming.establishConnectionToRegion(regionValue);
        return false;
    },
    toggleOpen: function (event) {
        var faq = document.getElementById('faq');
        if (faq.className.indexOf('open') !== -1) {
            faq.className = faq.className.replace(' open', '');
        } else {
            faq.className = faq.className + " open";
        }
    }
};

Incoming.RocketAlert = function (regionNumber) {
    this.initialize(regionNumber);
};

Incoming.RocketAlert.prototype = {
    HEARTBEAT_INTERVAL: 10000,
    initialize: function (regionNumber) {
        this.regionNumber = regionNumber;
        this.statusElem = document.getElementById('status');
        this.logElem = document.getElementById('log');
        this.siren = document.getElementById('siren');

        this.websocket = new WebSocket("ws://v.maraney.com:8080/" + regionNumber);
        this.websocket.onopen = this.onOpen.bind(this);
        this.websocket.onclose = this.onClose.bind(this);
        this.websocket.onmessage = this.onMessage.bind(this);
        this.websocket.onerror = this.onError.bind(this);
        setTimeout(this.heartbeat.bind(this), this.HEARTBEAT_INTERVAL);
    },
    close: function () {
        this.websocket.close();
    },
    onOpen: function (event) {
        this.writeLog("Opening connection to warning area: " + this.regionNumber);
    },
    onClose: function (event) {
        this.writeLog("Connection closed to warning area: " + this.regionNumber);
    },
    onMessage: function (event) {
        var msg = event.data,
            secSinceEnded = 0,
            alertEnded;
        if (/alert_ended/.test(msg)) {
            this.stopSiren();
            alertEnded = msg.split(',');
            secSinceEnded = parseInt(alertEnded[1].trim(), 10);
            this.statusElem.innerHTML = "Alert ended at " + (new Date((new Date()) - (secSinceEnded * 1000))).toLocaleTimeString() + "! Wait for the all clear!"
            this.statusElem.style.backgroundColor = 'yellow';

        } else if (msg === 'all_clear') {
            this.stopSiren();
            this.statusElem.innerHTML = "All Clear!";
            this.statusElem.style.backgroundColor = 'green';
        } else if (msg === 'alert') {
            this.statusElem.innerHTML = "Alert! Seek shelter!";
            this.statusElem.style.backgroundColor = 'red';
            this.siren.play();
        } else {
            this.stopSiren();
            this.statusElem.innerHTML = 'Unknown response';
            this.statusElem.style.backgroundColor = 'white';
        }
        this.writeLog("Received Message: " + msg);
    },
    onError: function (event) {
        this.writeLog("Error with connection...");
    },
    writeLog: function (msg) {
        this.logElem.value = (new Date()).toLocaleTimeString() + ": " + msg + "\n" + this.logElem.value;
    },
    stopSiren: function () {
        this.siren.pause();
        if (this.siren.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.siren.currentTime = 0;
        }
    },
    heartbeat: function () {
        if (this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send('heartbeat');
            this.writeLog("Sent heartbeat");
            setTimeout(this.heartbeat.bind(this), this.HEARTBEAT_INTERVAL);
        }
    }
};

Incoming.initPage();


