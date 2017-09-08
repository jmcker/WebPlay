
var ctx = new window.AudioContext();
var url = 'http://www.mfiles.co.uk/mp3-downloads/frederic-chopin-piano-sonata-2-op35-3-funeral-march.mp3';
var audio = new Audio(url);
// 2048 sample buffer, 1 channel in, 1 channel out  
var processor = ctx.createScriptProcessor(2048, 1, 1);
var meter = document.getElementById('meter');
var source;

audio.addEventListener('canplaythrough', function () {
    source = ctx.createMediaElementSource(audio);
    source.connect(processor);
    source.connect(ctx.destination);
    processor.connect(ctx.destination);
    audio.play();
    alert("playing");
}, false);

// loop through PCM data and calculate average
// volume for a given 2048 sample buffer
processor.onaudioprocess = function (evt) {
    var input = evt.inputBuffer.getChannelData(0);
    var len = input.length;
    var total = 0;
    var i = 0;
    var rms;
    while (i < len) {
        total += Math.abs(input[i++]);
    }
    rms = Math.sqrt(total / len);
    meter.style.width = (rms * 100) + '%';
    var decibel = gainTodB(rms);
    console.log("rms: " + rms);
    console.log("dB: " + decibel);
}



divide by 255 to find percent and fill the thing based on that