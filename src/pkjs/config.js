module.exports = [
  {
    "type": "heading",
    "defaultValue": "Simple Round"
  },
  {
    "type": "text",
    "defaultValue": "Analog watchface with live weather for Pebble Round 2."
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Appearance"
      },
      {
        "type": "toggle",
        "messageKey": "DarkMode",
        "label": "Dark Mode",
        "description": "Black background with white elements.",
        "defaultValue": false
      },
      {
        "type": "toggle",
        "messageKey": "Use24Hour",
        "label": "Use 24-Hour Time",
        "description": "Off = 12-hour time.",
        "defaultValue": false
      },
      {
        "type": "toggle",
        "messageKey": "ShowDigitalTime",
        "label": "Show Digital Time",
        "defaultValue": true
      },
      {
        "type": "toggle",
        "messageKey": "ShowDate",
        "label": "Show Date",
        "defaultValue": true
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Weather"
      },
      {
        "type": "toggle",
        "messageKey": "UseFahrenheit",
        "label": "Use Fahrenheit (°F)",
        "description": "Off = Celsius (°C).",
        "defaultValue": true
      },
      {
        "type": "toggle",
        "messageKey": "ShowWeather",
        "label": "Show Weather",
        "defaultValue": true
      }
    ]
  },
  {
    "type": "submit",
    "defaultValue": "Save Settings"
  }
];
