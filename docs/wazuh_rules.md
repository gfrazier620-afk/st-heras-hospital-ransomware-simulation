# Wazuh Custom Detection Rules — Complete Write-Up
## St. Hera's Hospital — Phishing Ransomware Simulation
### CyberLab Capstone Project

---

## Overview

This document covers every custom Wazuh detection rule built for the St. Hera's Hospital capstone simulation. These rules detect the full attack chain from phishing credential theft through ransomware impact from the defender's perspective.

All rules live in one file on the Wazuh VM:
```
/var/ossec/etc/rules/local_rules.xml
```

**Total rules: 18**

---

## How to Deploy the Rules

We use Apache on Kali to transfer the rules file to the Wazuh VM — no SCP or direct SSH file transfer needed.

**Step 1 — Edit the rules file on Kali:**
```bash
nano ~/local_rules.xml
```

**Step 2 — Push to Apache:**
```bash
sudo cp ~/local_rules.xml /var/www/html/local_rules.xml
```

**Step 3 — On the Wazuh VM download and install:**
```bash
curl http://192.168.0.218/local_rules.xml -o /var/ossec/etc/rules/local_rules.xml
```

**Step 4 — Test for syntax errors (no output = no errors):**
```bash
/var/ossec/bin/wazuh-analysisd -t
```

**Step 5 — Restart the manager:**
```bash
systemctl restart wazuh-manager
```

---

## Windows Audit Policies Required

Run these on **both Windows VMs** as Administrator before testing.
Without these, Windows will not generate the events Wazuh needs:

```powershell
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"File Share" /success:enable /failure:enable
auditpol /set /subcategory:"Detailed File Share" /success:enable /failure:enable
auditpol /set /subcategory:"File System" /success:enable /failure:enable
auditpol /set /subcategory:"Process Creation" /success:enable
auditpol /set /subcategory:"Filtering Platform Connection" /success:enable /failure:enable
auditpol /set /subcategory:"Account Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Filtering Platform Packet Drop" /failure:enable
```

**Also required — remove EventID exclusions from agent config on both VMs:**
```powershell
$path = "C:\Program Files (x86)\ossec-agent\ossec.conf"
$text = [System.IO.File]::ReadAllText($path)
$eventIds = 4663, 5145, 5156, 5152
foreach ($eventId in $eventIds) {
    $text = [regex]::Replace($text, "(?i)\s+and\s+EventID\s*!=\s*$eventId\b", "")
    $text = [regex]::Replace($text, "(?i)\bEventID\s*!=\s*$eventId\s+and\s+", "")
}
[System.IO.File]::WriteAllText($path, $text)
NET STOP WazuhSvc
NET START WazuhSvc
```

**Add SACL auditing to monitored folders (required for Event 4663):**

File Explorer → Right-click `C:\HospitalServer\PatientRecords` → Properties → Security → Advanced → Auditing → Add → Everyone → Success → Read, Write, Delete → OK → Apply

Repeat for `C:\HospitalServer\RansomwareDemo`

---

## CDB Threat Intelligence Lists

Two CDB lists were created for automated IP-based threat detection:

**Create on Kali and push to Wazuh:**
```bash
echo "192.168.0.218:simulated-phishing-portal" > ~/ocblue_suspicious_destinations
echo "192.168.0.236:approved-hospital-system" > ~/ocblue_trusted_smb_sources
sudo cp ~/ocblue_suspicious_destinations /var/www/html/
sudo cp ~/ocblue_trusted_smb_sources /var/www/html/
```

**On Wazuh VM install and register:**
```bash
curl http://192.168.0.218/ocblue_suspicious_destinations -o /var/ossec/etc/lists/ocblue_suspicious_destinations
curl http://192.168.0.218/ocblue_trusted_smb_sources -o /var/ossec/etc/lists/ocblue_trusted_smb_sources
chown root:wazuh /var/ossec/etc/lists/ocblue_*
chmod 660 /var/ossec/etc/lists/ocblue_*
```

**Register in `/var/ossec/etc/ossec.conf` under `<ruleset>`:**
```xml
<list>etc/lists/ocblue_suspicious_destinations</list>
<list>etc/lists/ocblue_trusted_smb_sources</list>
```

---

## Complete Rules File

```xml
<!-- ============================================================
     St. Hera's Hospital — CyberLab Capstone Rules
     18 custom rules covering the full attack chain
     ============================================================ -->

<group name="local,syslog,sshd,">
  <rule id="100001" level="5">
    <if_sid>5716</if_sid>
    <srcip>1.1.1.1</srcip>
    <description>sshd: authentication failed from IP 1.1.1.1.</description>
    <group>authentication_failed,pci_dss_10.2.4,pci_dss_10.2.5,</group>
  </rule>
</group>

<group name="cyberlab,attack_simulation,">

  <!-- ──────────────────────────────────────────────────────
       RULE 100: Phishing Portal Accessed
       Fires when the fake hospital email page is opened
       ────────────────────────────────────────────────────── -->
  <rule id="100" level="6">
    <if_group>syslog</if_group>
    <url>email.html</url>
    <description>Phishing portal accessed - fake hospital email page opened</description>
    <mitre><id>T1566</id></mitre>
    <group>phishing,initial_access,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 101: Credentials Submitted to Phishing Portal
       Fires when victim POSTs to login.php
       ────────────────────────────────────────────────────── -->
  <rule id="101" level="12">
    <if_group>syslog</if_group>
    <url>login.php</url>
    <match>POST</match>
    <description>Credentials submitted to phishing portal - credential theft detected</description>
    <mitre><id>T1566.001</id></mitre>
    <group>phishing,credential_theft,high_severity,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 102: SMB Network Logon (Parent Rule)
       Detects ANY network logon — not hardcoded to a specific IP
       Level 4 — not every SMB logon is suspicious on its own
       ────────────────────────────────────────────────────── -->
  <rule id="102" level="4">
    <if_group>windows</if_group>
    <field name="win.system.eventID">^4624$</field>
    <field name="win.eventdata.logonType">^3$</field>
    <description>Network logon detected on file share server - SMB authentication attempt</description>
    <mitre><id>T1078</id></mitre>
    <group>smb_logon,lateral_movement,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 10200: Whitelist Known Good IP
       Suppresses rule 102 alerts for the nurse workstation
       Level 0 = no alert generated
       ────────────────────────────────────────────────────── -->
  <rule id="10200" level="0">
    <if_sid>102</if_sid>
    <srcip>192.168.0.236</srcip>
    <description>Known good IP accessing file share - suppressed</description>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 103: Port Scan Seed (quiet — no_log)
       Detects individual blocked TCP probes via Event 5152
       Feeds into rule 10301 for multi-port detection
       ────────────────────────────────────────────────────── -->
  <rule id="103" level="2">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^5152$</field>
    <field name="win.eventdata.destAddress">^192\.168\.0\.236$</field>
    <field name="win.eventdata.protocol">^6$</field>
    <options>no_log</options>
    <description>Blocked TCP probe from $(win.eventdata.sourceAddress) to patient server port $(win.eventdata.destPort)</description>
    <group>network_probe,firewall,reconnaissance,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 10301: Rapid Multi-Port Scan Detection
       Parent-child: fires when rule 103 fires 40+ times in 5s
       from the same source IP hitting DIFFERENT ports
       ────────────────────────────────────────────────────── -->
  <rule id="10301" level="10" frequency="40" timeframe="5">
    <if_matched_sid>103</if_matched_sid>
    <same_field>win.eventdata.sourceAddress</same_field>
    <different_field>win.eventdata.destPort</different_field>
    <description>CRITICAL: Rapid multi-port scan detected against patient server from $(win.eventdata.sourceAddress)</description>
    <mitre><id>T1046</id></mitre>
    <group>port_scan,network_service_discovery,reconnaissance,soc_queue,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 104: Patient File Access After Logon
       Parent-child: only fires if rule 102 already fired
       from same source IP — correlated logon + file access
       ────────────────────────────────────────────────────── -->
  <rule id="104" level="12">
    <if_matched_sid>102</if_matched_sid>
    <same_source_ip />
    <field name="win.system.eventID">^4663$</field>
    <description>Patient file accessed after suspicious network logon - credential reuse and data exfiltration</description>
    <mitre><id>T1078</id><id>T1083</id></mitre>
    <group>file_access,data_exfiltration,high_severity,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 105: Failed SMB Authentication
       Parent rule for brute force detection (rule 110)
       ────────────────────────────────────────────────────── -->
  <rule id="105" level="8">
    <if_group>windows</if_group>
    <field name="win.system.eventID">^4625$</field>
    <field name="win.eventdata.logonType">^3$</field>
    <description>Failed network logon to file share - possible brute force</description>
    <mitre><id>T1110</id></mitre>
    <group>authentication_failed,brute_force,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 106: FIM — File Renamed to .locked
       Fires when FIM detects a file rename with .locked extension
       Level 15 = CRITICAL (highest severity in Wazuh)
       Tagged soc_queue for SOC analyst filtering
       ────────────────────────────────────────────────────── -->
  <rule id="106" level="15">
    <if_group>syscheck</if_group>
    <match>.locked</match>
    <description>CRITICAL: File renamed with .locked extension - ransomware activity detected</description>
    <mitre><id>T1486</id></mitre>
    <group>ransomware,impact,critical_severity,soc_queue,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 107: FIM — Ransom Note Dropped
       Fires when FIM detects ransom_note.txt being created
       Tagged soc_queue for SOC analyst filtering
       ────────────────────────────────────────────────────── -->
  <rule id="107" level="15">
    <if_group>syscheck</if_group>
    <match>ransom_note</match>
    <description>CRITICAL: Ransom note file detected - ransomware impact confirmed</description>
    <mitre><id>T1486</id></mitre>
    <group>ransomware,impact,critical_severity,soc_queue,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 108: Full Attack Chain Confirmed
       Parent-child: fires when rule 106 fires
       Confirms complete phishing → lateral movement → ransomware chain
       NOTE: Must use simple if_matched_sid with NO field conditions
       Adding field conditions prevents this rule from firing
       Tagged soc_queue for SOC analyst filtering
       ────────────────────────────────────────────────────── -->
  <rule id="108" level="15">
    <if_matched_sid>106</if_matched_sid>
    <description>CRITICAL: Full attack chain confirmed - hospital server ransomware detected following credential theft and lateral movement</description>
    <mitre>
      <id>T1566.001</id>
      <id>T1078</id>
      <id>T1083</id>
      <id>T1486</id>
    </mitre>
    <group>attack_chain,critical_severity,full_compromise,soc_queue,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 109: Phishing Page Opened
       Detects GET request to email.html
       Shows the moment the nurse clicked the phishing link
       ────────────────────────────────────────────────────── -->
  <rule id="109" level="5">
    <if_group>syslog</if_group>
    <match>GET</match>
    <url>email.html</url>
    <description>Phishing email page accessed - potential victim visiting fake hospital portal</description>
    <mitre><id>T1566</id></mitre>
    <group>phishing,initial_access,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 110: Brute Force SMB Detection
       Parent-child: fires when rule 105 fires 5+ times
       from same source IP within 60 seconds
       ────────────────────────────────────────────────────── -->
  <rule id="110" level="10" frequency="5" timeframe="60">
    <if_matched_sid>105</if_matched_sid>
    <same_source_ip />
    <description>Brute force detected: multiple failed SMB logons within 60 seconds</description>
    <mitre><id>T1110</id></mitre>
    <group>brute_force,authentication_failed,high_severity,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 111: Ransom Note Accessed
       Fires when Event 4663 detects someone opening the ransom note
       Confirms ransomware impact has been discovered
       ────────────────────────────────────────────────────── -->
  <rule id="111" level="12">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^4663$</field>
    <field name="win.eventdata.objectName" type="pcre2">(?i)ransom_note</field>
    <description>CRITICAL: Ransom note accessed - ransomware impact confirmed</description>
    <mitre><id>T1486</id></mitre>
    <group>ransomware,impact,critical_severity,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 112: After Hours SMB Logon
       Nurses don't log in at 3am
       Flags SMB access between 11pm and 6am as suspicious
       ────────────────────────────────────────────────────── -->
  <rule id="112" level="10">
    <if_sid>102</if_sid>
    <time>11pm - 6am</time>
    <description>SMB logon outside business hours - possible unauthorized access</description>
    <mitre><id>T1078</id></mitre>
    <group>after_hours,lateral_movement,suspicious_logon,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 113: Mass File Encryption Detection
       Parent-child: fires when rule 106 fires 2+ times
       within 120 seconds — active ransomware pattern
       Tagged soc_queue for SOC analyst filtering
       ────────────────────────────────────────────────────── -->
  <rule id="113" level="15" frequency="2" timeframe="120">
    <if_matched_sid>106</if_matched_sid>
    <description>CRITICAL: Mass file encryption detected - multiple .locked files created within 120 seconds - active ransomware attack in progress</description>
    <mitre><id>T1486</id></mitre>
    <group>ransomware,impact,critical_severity,mass_encryption,soc_queue,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 100099: Suspicious HTTP POST
       Detects POST requests to login.php from Apache logs
       ────────────────────────────────────────────────────── -->
  <rule id="100099" level="10">
    <if_group>syslog</if_group>
    <match>POST</match>
    <url>login.php</url>
    <description>Suspicious HTTP POST to credential harvesting endpoint detected - possible phishing credential theft in progress</description>
    <mitre><id>T1566</id><id>T1190</id><id>T1078</id></mitre>
    <group>suspicious_http,phishing,credential_theft,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 100100: Patient Record File Access (Operation Code Blue)
       Detects Event 4663 when a file inside PatientRecords is accessed
       Shows the exfiltration phase of the attack
       ────────────────────────────────────────────────────── -->
  <rule id="100100" level="7">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^4663$</field>
    <field name="win.eventdata.objectName" type="pcre2">(?i)HospitalServer.*PatientRecords</field>
    <description>Operation Code Blue: Patient record accessed: $(win.eventdata.objectName)</description>
    <group>patient_records,file_access,</group>
  </rule>

  <!-- ──────────────────────────────────────────────────────
       RULE 100101: Remote SMB Share Access (Operation Code Blue)
       Detects Event 5145 when someone remotely accesses
       the PatientRecords SMB share from outside the network
       Shows source IP, username, and filename accessed
       Tagged soc_queue for SOC analyst filtering
       ────────────────────────────────────────────────────── -->
  <rule id="100101" level="8">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^5145$</field>
    <field name="win.eventdata.shareName" type="pcre2">(?i)PatientRecords</field>
    <description>Operation Code Blue: Remote SMB access from $(win.eventdata.ipAddress) by $(win.eventdata.subjectUserName), target: $(win.eventdata.relativeTargetName)</description>
    <group>patient_records,smb_access,remote_access,soc_queue,</group>
  </rule>

</group>
```

---

## Rule Summary Table

| Rule ID | Level | Description | MITRE | Fires When | SOC Queue |
|---|---|---|---|---|---|
| 100 | 6 | Phishing portal accessed | T1566 | email.html opened | |
| 101 | 12 | Credentials submitted | T1566.001 | POST to login.php | |
| 102 | 4 | SMB network logon | T1078 | Event 4624 LogonType 3 | |
| 10200 | 0 | Whitelist known good IP | — | Suppresses 192.168.0.236 | |
| 103 | 2 | Port scan seed | T1046 | Event 5152 blocked probe | |
| 10301 | 10 | Multi-port scan | T1046 | 40 probes in 5s same IP | |
| 104 | 12 | File access after logon | T1078/T1083 | Event 4663 after rule 102 | |
| 105 | 8 | Failed SMB logon | T1110 | Event 4625 LogonType 3 | |
| 106 | **15** | .locked file rename | T1486 | FIM detects .locked extension | ✅ |
| 107 | **15** | Ransom note dropped | T1486 | FIM detects ransom_note | ✅ |
| 108 | **15** | Full attack chain | T1566/T1078/T1083/T1486 | Rule 106 fires | ✅ |
| 109 | 5 | Phishing page opened | T1566 | GET request to email.html | |
| 110 | 10 | Brute force SMB | T1110 | 5 failed logons in 60s | |
| 111 | 12 | Ransom note opened | T1486 | Event 4663 on ransom_note | |
| 112 | 10 | After hours logon | T1078 | SMB logon 11pm–6am | |
| 113 | **15** | Mass encryption | T1486 | 2+ .locked files in 120s | ✅ |
| 100099 | 10 | Suspicious HTTP POST | T1566/T1190/T1078 | POST to login.php | |
| 100100 | 7 | Patient record access | — | Event 4663 on PatientRecords | |
| 100101 | 8 | Operation Code Blue SMB | — | Event 5145 on PatientRecords | ✅ |

---

## SOC Queue

Rules tagged `soc_queue` are the high-priority actionable alerts.
Filter in Wazuh dashboard or Threat Hunting with:
```
rule.groups:soc_queue
```

**Rules in SOC queue:**
- Rule 106 — .locked file rename (CRITICAL)
- Rule 107 — Ransom note dropped (CRITICAL)
- Rule 108 — Full attack chain confirmed (CRITICAL)
- Rule 113 — Mass encryption detected (CRITICAL)
- Rule 100101 — Operation Code Blue SMB access (HIGH)
- Rule 10301 — Rapid multi-port scan (HIGH)

---

## Confirmed Firing in Lab

| Rule | Status | Notes |
|---|---|---|
| 102 | ✅ Confirmed | Fires on every SMB connection |
| 106 | ✅ Confirmed | Fires when ransomware sim runs |
| 107 | ✅ Confirmed | Fires when ransom note drops |
| 108 | ✅ Confirmed | Fires immediately after 106 |
| 112 | ✅ Confirmed | Fires during after-hours testing |
| 113 | ✅ Confirmed | Fires during full ransomware sim |
| 100101 | ✅ Confirmed | Fires on smbclient PatientRecords access |

---

## CYBERLAB Security Monitor Dashboard

9 panels at `https://192.168.0.177/app/dashboards`:

| Panel | DQL Filter |
|---|---|
| Ransomware Events | `rule.id:106 OR rule.id:107` |
| Alerts Over Time | (no filter) |
| Rule Groups Pie | (no filter) |
| Top Rules Table | (no filter) |
| After Hours Logon | `rule.id:112` |
| Mass Encryption Events | `rule.id:113` |
| Operation Code Blue | `rule.id:100101` |
| Full Attack Chain | `rule.id:108` |
| SMB Logon Count | `data.win.system.eventID:4624` |

**Before demo:** Set time range to **Last 15 minutes**

---

## Checking Alerts on Wazuh VM

```bash
# Watch alerts live
tail -f /var/ossec/logs/alerts/alerts.log

# Check specific rules
grep "Rule: 106\|Rule: 107\|Rule: 108\|Rule: 113" /var/ossec/logs/alerts/alerts.log

# Check Operation Code Blue
grep "Code Blue\|100101\|PatientRecords" /var/ossec/logs/alerts/alerts.log

# Check all soc_queue alerts
grep "soc_queue" /var/ossec/logs/alerts/alerts.log | tail -20
```

---

## Troubleshooting Common Issues

**wazuh-analysisd -t returns error:**
- `Signature not found` — parent rule ID doesn't exist or wrong order in file
- `Field srcip is static` — remove `$(srcip)` from rule description
- `Invalid rule id` — IDs must be integers only, max 6 digits
- `Invalid attribute for rule` — check frequency/timeframe syntax

**Rules not firing:**
- Check audit policies are still enabled after reboot
- Verify SACL is set on monitored folders
- Remove EventID exclusions from ossec.conf on Windows VMs
- Check for duplicate Security localfile entries in ossec.conf

**Dashboard panels showing zero:**
- Set time range to Last 15 minutes
- Remove agent.name filters from panels
- Run a test attack to generate events first

---

## Lab Environment Reference

| VM | Role | IP |
|---|---|---|
| Kali Linux | Attacker + Watcher | 192.168.0.218 |
| WIN-NURSE-WORKSTATION | Phishing Victim + Wazuh Agent | 192.168.0.236 |
| WIN-HOSPITAL-SERVER | Patient Data Server + Wazuh Agent | 192.168.0.237 |
| Wazuh OVA | SIEM Manager + Dashboard | 192.168.0.177 |

---

*Capstone Project — St. Hera's Hospital Phishing Ransomware Simulation*
*Lab environment — all data and accounts are completely fictional*
