import Poco    from "commodetto/Poco";
import Message  from "pebble/message";
import Location from "embedded:sensor/Location";

const render = new Poco(screen);

// Gabbro (Round 2): 260 × 260 round display
const CX = render.width >> 1;    // 130
const CY = render.height >> 1;   // 130
const R  = 118;                   // clock face outer radius

// ── Persistent settings ───────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
    darkMode:      false,
    useFahrenheit: true,
    use24Hour:     false,
    showDigitalTime: true,
    showDate:        true,
    showWeather:     true
};

function loadSettings() {
    const stored = localStorage.getItem("settings");
    if (stored) {
        try { return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }; }
        catch (e) {}
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
}

let settings = loadSettings();

// ── Theme colors (rebuilt when settings change) ───────────────────────────────
const red    = render.makeColor(210, 45,  45);
const yellow = render.makeColor(230, 185, 0);

let bg, fg, fgDim, tempColor;

function updateColors() {
    const dark = settings.darkMode;
    bg        = dark ? render.makeColor(0,   0,   0)   : render.makeColor(255, 255, 255);
    fg        = dark ? render.makeColor(255, 255, 255) : render.makeColor(0,   0,   0);
    fgDim     = dark ? render.makeColor(90,  90,  90)  : render.makeColor(160, 160, 160);
    tempColor = dark ? render.makeColor(100, 180, 255) : render.makeColor(0,   110, 210);
}

updateColors();

// ── Fonts ─────────────────────────────────────────────────────────────────────
const timeFont  = new render.Font("Bitham-Black",     30);
const numFont   = new render.Font("Gothic-Bold",      28);
const smallFont = new render.Font("Roboto-Condensed", 21);

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"];

// ── State ─────────────────────────────────────────────────────────────────────
let weatherTemp = null;   // integer °, or null = no data
let weatherCode = -1;     // WMO weather code, -1 = no data
let lastDate = new Date();
let location = null;
let lastLatitude = null;
let lastLongitude = null;

// ── Weather cache ─────────────────────────────────────────────────────────────
function loadCachedWeather() {
    const cached     = localStorage.getItem("weather");
    const cachedTime = localStorage.getItem("weatherTime");
    if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime);
        if (age < 60 * 60 * 1000) {
            try {
                const w = JSON.parse(cached);
                weatherTemp = w.temp;
                weatherCode = w.code;
                return true;
            } catch (e) {}
        }
    }
    return false;
}

function saveWeather() {
    if (weatherTemp !== null) {
        localStorage.setItem("weather",     JSON.stringify({ temp: weatherTemp, code: weatherCode }));
        localStorage.setItem("weatherTime", String(Date.now()));
    }
}

loadCachedWeather();

// ── Geometry helper ───────────────────────────────────────────────────────────
function pt(angle, r) {
    return [
        (CX + r * Math.sin(angle)) | 0,
        (CY - r * Math.cos(angle)) | 0
    ];
}

// ─── Weather icons ────────────────────────────────────────────────────────────

function drawSun(x, y, r, color) {
    render.drawCircle(color, x, y, r,     0, 360);
    render.drawCircle(color, x, y, r - 1, 0, 360);
    render.drawCircle(color, x, y, r - 2, 0, 360);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        render.drawLine(
            (x + (r + 2) * Math.sin(a)) | 0, (y - (r + 2) * Math.cos(a)) | 0,
            (x + (r + 7) * Math.sin(a)) | 0, (y - (r + 7) * Math.cos(a)) | 0,
            color, 2);
    }
    for (let i = 0; i < 4; i++) {
        const a = ((i + 0.5) / 4) * Math.PI * 2;
        render.drawLine(
            (x + (r + 2) * Math.sin(a)) | 0, (y - (r + 2) * Math.cos(a)) | 0,
            (x + (r + 5) * Math.sin(a)) | 0, (y - (r + 5) * Math.cos(a)) | 0,
            color, 2);
    }
}

function drawCloud(x, y, color) {
    render.drawCircle(color, x - 5, y + 3, 7, 0, 360);
    render.drawCircle(color, x + 5, y + 3, 7, 0, 360);
    render.drawCircle(color, x,     y - 2, 6, 0, 360);
}

function drawSnowflake(x, y, color) {
    render.drawLine(x - 9, y,     x + 9, y,     color, 2);
    render.drawLine(x,     y - 9, x,     y + 9, color, 2);
    render.drawLine(x - 6, y - 6, x + 6, y + 6, color, 2);
    render.drawLine(x + 6, y - 6, x - 6, y + 6, color, 2);
    render.drawCircle(color, x, y, 2, 0, 360);
}

function drawWeatherIcon(x, y, code) {
    if (code < 0) return;
    if (code === 0) {
        drawSun(x, y, 7, yellow);
    } else if (code <= 2) {
        drawSun(x + 4, y - 5, 5, yellow);
        drawCloud(x - 2, y + 4, fg);
    } else if (code <= 44) {
        drawCloud(x, y, fg);
    } else if (code <= 48) {
        drawCloud(x, y - 4, fg);
        render.drawLine(x - 9, y + 8,  x + 9, y + 8,  fg,    2);
        render.drawLine(x - 7, y + 13, x + 7, y + 13, fgDim, 2);
    } else if (code <= 67) {
        drawCloud(x, y - 6, fg);
        const drops = code <= 55 ? 2 : 3;
        for (let i = 0; i < drops; i++) {
            const dx = x - 5 + i * 5;
            render.drawLine(dx, y + 5, dx - 3, y + 13, tempColor, 2);
        }
    } else if (code <= 77) {
        drawSnowflake(x, y, fg);
    } else if (code <= 86) {
        drawCloud(x, y - 7, fg);
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            render.drawLine(x, y + 7,
                (x + 7 * Math.sin(a)) | 0, (y + 7 - 7 * Math.cos(a)) | 0,
                fg, 2);
        }
    } else {
        drawCloud(x, y - 7, fg);
        render.drawLine(x + 4, y + 4,  x - 2, y + 12, yellow, 3);
        render.drawLine(x - 2, y + 12, x + 4, y + 20, yellow, 3);
    }
}

// ─── Clock face ───────────────────────────────────────────────────────────────

const CLOCK_NUMS = new Map([[0, "12"], [15, "3"], [30, "6"], [45, "9"]]);

function drawFace() {
    for (let i = 0; i < 60; i++) {
        const a     = (i / 60) * Math.PI * 2;
        const label = CLOCK_NUMS.get(i);

        if (label !== undefined) {
            const nr = R - 20;
            const nx = (CX + nr * Math.sin(a)) | 0;
            const ny = (CY - nr * Math.cos(a)) | 0;
            const w  = render.getTextWidth(label, numFont);
            render.drawText(label, numFont, fg,
                nx - (w >> 1),
                ny - (numFont.height >> 1));
        } else if (i % 5 === 0) {
            const [x1, y1] = pt(a, R - 14);
            const [x2, y2] = pt(a, R - 2);
            render.drawLine(x1, y1, x2, y2, fg, 3);
        } else {
            const [x1, y1] = pt(a, R - 7);
            const [x2, y2] = pt(a, R - 2);
            render.drawLine(x1, y1, x2, y2, fgDim, 1);
        }
    }
}

// ─── Hands ────────────────────────────────────────────────────────────────────

function drawHand(angle, tipLen, tailLen, color, thickness) {
    const [x1, y1] = pt(angle + Math.PI, tailLen);
    const [x2, y2] = pt(angle, tipLen);
    render.drawLine(x1, y1, x2, y2, color, thickness);
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function drawInfo(now) {
    const hr = now.getHours();
    const mn = now.getMinutes();

    let timeStr;
    if (settings.use24Hour) {
        timeStr = `${String(hr).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
    } else {
        timeStr = `${hr % 12 || 12}:${String(mn).padStart(2, "0")}`;
    }

    const timeY = CY - 65;
    let textY = timeY;

    if (settings.showDigitalTime) {
        const timeTW  = render.getTextWidth(timeStr, timeFont);
        render.drawText(timeStr, timeFont, fg, (render.width - timeTW) >> 1, textY);
        textY += timeFont.height + 4;
    }

    if (settings.showDate) {
        const dateStr = `${DAYS[now.getDay()]} ${MONTHS[now.getMonth()]} ${String(now.getDate()).padStart(2, "0")}`;
        const dw = render.getTextWidth(dateStr, smallFont);
        render.drawText(dateStr, smallFont, fg, (render.width - dw) >> 1, textY);
    }

    if (settings.showWeather) {
        const iconY = CY + 34;
        drawWeatherIcon(CX, iconY, weatherCode);

        const unit = settings.useFahrenheit ? "F" : "C";
        const tempStr = weatherTemp !== null ? `${weatherTemp}°${unit}` : "--°";
        const tw2 = render.getTextWidth(tempStr, smallFont);
        render.drawText(tempStr, smallFont, tempColor, (render.width - tw2) >> 1, iconY + 16);
    }
}

// ─── Main draw ────────────────────────────────────────────────────────────────

function drawScreen(event) {
    const now = event?.date ?? lastDate;
    if (event?.date) lastDate = event.date;

    const hr = now.getHours() % 12;
    const mn = now.getMinutes();
    const hourAngle   = ((hr + mn / 60) / 12) * Math.PI * 2;
    const minuteAngle = (mn / 60) * Math.PI * 2;

    render.begin();
    render.fillRectangle(bg, 0, 0, render.width, render.height);

    drawFace();
    drawInfo(now);

    drawHand(minuteAngle, 95, 12, fg, 3);
    drawHand(hourAngle,   62, 18, fg, 5);

    const [tipX, tipY] = pt(hourAngle, 62);
    const [midX, midY] = pt(hourAngle, 47);
    render.drawLine(midX, midY, tipX, tipY, red, 5);

    render.drawCircle(fgDim, CX, CY, 8, 0, 360);
    render.drawCircle(red,   CX, CY, 6, 0, 360);
    render.drawCircle(bg,    CX, CY, 3, 0, 360);

    render.end();
}

// ─── Weather ──────────────────────────────────────────────────────────────────

let fetching = false;
let refetchAfterCurrent = false;

function requestLocation() {
    if (!settings.showWeather) return;
    if (fetching) return;
    if (location) {
        try { location.close(); } catch (e) {}
        location = null;
    }
    try {
        location = new Location({
            onSample() {
                const sample = this.sample();
                this.close();
                location = null;
                lastLatitude = sample.latitude;
                lastLongitude = sample.longitude;
                fetchWeather(sample.latitude, sample.longitude);
            }
        });
    } catch (e) {
        console.log("Location error: " + e);
    }
}

async function fetchWeather(lat, lon) {
    if (fetching) return;
    fetching = true;
    try {
        const unit = settings.useFahrenheit ? "fahrenheit" : "celsius";
        const url = `http://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`;
        const response = await fetch(url);
        const data = await response.json();

        weatherTemp = Math.round(data.current.temperature_2m);
        weatherCode = data.current.weather_code;

        if (!Number.isFinite(weatherTemp) || !Number.isFinite(weatherCode)) {
            throw new Error("invalid values");
        }

        saveWeather();
        drawScreen();
    } catch (e) {
        console.log("Weather error: " + e);
    } finally {
        fetching = false;
        if (refetchAfterCurrent) {
            refetchAfterCurrent = false;
            if (lastLatitude !== null && lastLongitude !== null) {
                fetchWeather(lastLatitude, lastLongitude);
            } else {
                requestLocation();
            }
        }
    }
}

// ─── Time events ──────────────────────────────────────────────────────────────

watch.addEventListener("minutechange", drawScreen);
watch.addEventListener("hourchange",   requestLocation);

// ─── Settings via Clay / AppMessage ──────────────────────────────────────────

const message = new Message({
    keys: ["DarkMode", "UseFahrenheit", "Use24Hour", "ShowDigitalTime", "ShowDate", "ShowWeather"],
    onReadable() {
        try {
            const msg = this.read();

            const dm = msg.get("DarkMode");
            if (dm !== undefined) settings.darkMode = dm === 1;

            const uf = msg.get("UseFahrenheit");
            if (uf !== undefined) settings.useFahrenheit = uf === 1;

            const u24 = msg.get("Use24Hour");
            if (u24 !== undefined) settings.use24Hour = u24 === 1;

            const sdt = msg.get("ShowDigitalTime");
            if (sdt !== undefined) settings.showDigitalTime = sdt === 1;

            const sd = msg.get("ShowDate");
            if (sd !== undefined) settings.showDate = sd === 1;

            const sw = msg.get("ShowWeather");
            if (sw !== undefined) settings.showWeather = sw === 1;

            const unitChanged = uf !== undefined;
            const weatherVisibilityChanged = sw !== undefined;
            if (unitChanged) {
                weatherTemp = null;
                weatherCode = -1;
            }

            saveSettings();
            updateColors();
            drawScreen();

            if (weatherVisibilityChanged && !settings.showWeather) {
                if (location) {
                    try { location.close(); } catch (e) {}
                    location = null;
                }
                refetchAfterCurrent = false;
            }

            if (unitChanged || (weatherVisibilityChanged && settings.showWeather)) {
                if (fetching) {
                    refetchAfterCurrent = true;
                } else if (lastLatitude !== null && lastLongitude !== null) {
                    fetchWeather(lastLatitude, lastLongitude);
                } else {
                    requestLocation();
                }
            }
        } catch (e) {
            console.log("Settings error: " + e);
        }
    }
});

// ─── Initial weather fetch ────────────────────────────────────────────────────

requestLocation();
