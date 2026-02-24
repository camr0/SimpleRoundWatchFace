#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def list_python_listen_ports():
    try:
        out = subprocess.check_output(
            ["lsof", "-nP", "-iTCP", "-sTCP:LISTEN"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return set()

    ports = set()
    for line in out.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 9:
            continue

        command = parts[0].lower()
        if not command.startswith("python"):
            continue

        name = parts[8]
        if ":" not in name:
            continue

        try:
            port = int(name.rsplit(":", 1)[1])
        except ValueError:
            continue

        ports.add(port)

    return ports


def send_config(
    port,
    dark_mode,
    use_fahrenheit,
    use_24_hour,
    show_digital_time,
    show_date,
    show_weather,
    show_battery,
    show_bluetooth,
):
    payload = {
        "DarkMode": {"value": bool(dark_mode)},
        "UseFahrenheit": {"value": bool(use_fahrenheit)},
        "Use24Hour": {"value": bool(use_24_hour)},
        "ShowDigitalTime": {"value": bool(show_digital_time)},
        "ShowDate": {"value": bool(show_date)},
        "ShowWeather": {"value": bool(show_weather)},
        "ShowBattery": {"value": bool(show_battery)},
        "ShowBluetooth": {"value": bool(show_bluetooth)},
    }
    encoded = urllib.parse.quote(json.dumps(payload, separators=(",", ":")), safe="")
    url = f"http://127.0.0.1:{port}/close?{encoded}"

    with urllib.request.urlopen(url, timeout=3) as resp:
        resp.read()
        return resp.status


def run_one_toggle(
    use_fahrenheit,
    dark_mode,
    use_24_hour,
    show_digital_time,
    show_date,
    show_weather,
    show_battery,
    show_bluetooth,
    timeout_s=10.0,
):
    baseline_ports = list_python_listen_ports()
    proc = subprocess.Popen(
        ["pebble", "emu-app-config"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    last_error = None
    deadline = time.time() + timeout_s

    try:
        while time.time() < deadline:
            current_ports = list_python_listen_ports()
            new_ports = current_ports - baseline_ports

            candidates = sorted(new_ports, reverse=True)
            for p in sorted(current_ports, reverse=True):
                if p not in new_ports:
                    candidates.append(p)

            for port in candidates:
                try:
                    status = send_config(
                        port,
                        dark_mode=dark_mode,
                        use_fahrenheit=use_fahrenheit,
                        use_24_hour=use_24_hour,
                        show_digital_time=show_digital_time,
                        show_date=show_date,
                        show_weather=show_weather,
                        show_battery=show_battery,
                        show_bluetooth=show_bluetooth,
                    )
                    if status == 200:
                        return port, status
                except urllib.error.HTTPError as e:
                    last_error = e
                except urllib.error.URLError as e:
                    last_error = e

            time.sleep(0.15)

        raise RuntimeError(
            str(last_error) if last_error else "timed out waiting for config endpoint"
        )
    finally:
        try:
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                proc.kill()


def main():
    parser = argparse.ArgumentParser(
        description="Stress test Pebble emu-app-config toggles"
    )
    parser.add_argument(
        "--count", type=int, default=30, help="number of toggle requests"
    )
    parser.add_argument(
        "--delay", type=float, default=0.35, help="delay between requests"
    )
    parser.add_argument(
        "--toggle-dark",
        action="store_true",
        help="also alternate DarkMode each request",
    )
    parser.add_argument(
        "--toggle-24h",
        action="store_true",
        help="also alternate Use24Hour each request",
    )
    parser.add_argument(
        "--toggle-visibility",
        action="store_true",
        help="also alternate ShowDigitalTime, ShowDate, ShowWeather, ShowBattery, ShowBluetooth",
    )
    args = parser.parse_args()

    try:
        for i in range(args.count):
            use_f = (i % 2) == 0
            dark_mode = (i % 2) == 1 if args.toggle_dark else False
            use_24_hour = (i % 2) == 0 if args.toggle_24h else False
            if args.toggle_visibility:
                show_digital_time = (i % 3) != 1
                show_date = (i % 3) != 2
                show_weather = (i % 3) != 0
                show_battery = (i % 4) != 1
                show_bluetooth = (i % 4) != 2
            else:
                show_digital_time = True
                show_date = True
                show_weather = True
                show_battery = True
                show_bluetooth = True

            port, status = run_one_toggle(
                use_f,
                dark_mode,
                use_24_hour,
                show_digital_time,
                show_date,
                show_weather,
                show_battery,
                show_bluetooth,
            )
            unit = "F" if use_f else "C"
            theme = "dark" if dark_mode else "light"
            clock = "24h" if use_24_hour else "12h"
            vis = (
                f"T:{int(show_digital_time)} D:{int(show_date)} "
                f"W:{int(show_weather)} B:{int(show_battery)} BT:{int(show_bluetooth)}"
            )
            print(
                f"{i + 1}/{args.count} -> {unit}, {theme}, {clock}, {vis} via :{port} (HTTP {status})"
            )
            time.sleep(args.delay)

        print("Done toggling settings")
    except (RuntimeError, urllib.error.URLError, TimeoutError) as e:
        print(f"Stress test failed: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
