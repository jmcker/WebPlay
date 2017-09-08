var secs = 204.403;
var time = "3:24.403";
var arr = [3, 24, 403];

console.log(secToTime(secs, 3));
console.log(secToArray(secs));
console.log(timeToSec(time));
console.log(timeToArray(time));
console.log(arrayToSec(arr));
console.log(arrayToTime(arr));


function secToTime(sec, decimals) {
    decimals = decimals || 1;
    if (sec === "")
        sec = 0;
    sec = parseFloat(sec);
    var ms = (sec - parseInt(sec)).toFixed(decimals);
    var min = parseInt(sec / 60);
    var sec = (sec % 60).toFixed(2);
    return min + ":" + pad(sec) + String(ms).substring(1);
}

function timeToSec(time) {
    if (time === "")
        return 0;
    var min = parseInt(time.substring(0, time.indexOf(":")));
    var sec = parseFloat(time.substring(time.indexOf(":") + 1));
    return (60 * min + sec).toFixed(3);
}

function secToArray(sec) {
    var arr = [0, 0, 0];
    if (sec === 0 || sec === "")
        return arr;
    sec = parseFloat(sec);
    arr[0] = parseInt(sec / 60);
    arr[1] = parseInt(sec % 60);
    arr[2] = (sec - parseInt(sec)).toFixed(3) * 1000;
    return arr;   
}

function timeToArray(time) {
    return secToArray(timeToSec(time));
}

function arrayToSec(arr) {
    return parseInt(arr[0]) * 60 + parseInt(arr[1]) + parseInt(arr[2]) / 1000;
}

function arrayToTime(arr) {
    return secToTime(arrayToSec(arr), 3);
}

function pad(n) {
    n = parseInt(n);
    if (n >=0 && n < 10) 
        return "0" + n; 
    if(n > -10 && n < 0) 
        return "-0" + Math.abs(n); 
    return n; 
}