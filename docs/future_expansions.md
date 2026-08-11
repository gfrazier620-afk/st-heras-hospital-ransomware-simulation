St. Hera's Hospital — Future Expansion Roadmap
Areas Planned to Make the Simulation More Advanced & Realistic

This document outlines the planned improvements and expansions to the St. Hera's Hospital ransomware simulation. Each area below would make the lab more technically accurate, more realistic, and more aligned with how real-world ransomware attacks actually operate.

01 — Level 3: Network-Wide Ransomware Propagation

Difficulty: Hard

What we would add: After initial compromise, have ransomware_sim.py automatically scan the entire subnet using Nmap, identify every live Windows machine, and lock files on each one using stolen credentials — not just the two pre-configured VMs.

Why it makes it more realistic: Real ransomware like WannaCry and NotPetya don't stop at one machine — they spread laterally across the entire network automatically. This would show the true scale of a hospital-wide ransomware event rather than just two targeted machines.

Real-world equivalent: WannaCry (2017) spread to over 200,000 systems across 150 countries including the UK NHS, shutting down hospitals nationwide and cancelling thousands of appointments.

MITRE ATT&CK: T1210 — Exploitation of Remote Services · T1570 — Lateral Tool Transfer

02 — Double Extortion: Data Exfiltration Before Encryption

Difficulty: Medium

What we would add: Before locking any files, have the simulation automatically copy all patient records from the hospital server to the Kali machine using smbclient. Then lock the files. Present two separate threats to the victim — pay or we publish the data AND pay or you lose access.

Why it makes it more realistic: Modern ransomware groups use double extortion as standard practice. Victims face two separate threats simultaneously, making payment far more likely and the attack far more damaging. This is the current standard for all major ransomware operations.

Real-world equivalent: LockBit 3.0 exfiltrated data from over 1,700 organizations before encrypting, then published it publicly when ransoms weren't paid. BlackCat and Cl0p operate the same way.

MITRE ATT&CK: T1041 — Exfiltration Over C2 Channel · T1039 — Data from Network Shared Drive

03 — Anti-Forensics: Stop Wazuh Before Encrypting

Difficulty: Medium

What we would add: Add a step to ransomware_sim.py that stops the Wazuh agent service on both Windows VMs before locking files. Then show Wazuh detecting the agent going silent as an early warning indicator, followed by complete loss of visibility during the attack itself.

Why it makes it more realistic: Real ransomware groups disable antivirus, SIEM agents, and backup software before encrypting to blind defenders and prevent detection. This technique shows both the attacker's method and how defenders can detect the absence of an agent as a threat signal.

Real-world equivalent: Conti ransomware routinely killed AV processes, backup agents, and security monitoring tools before deploying encryption payloads. This is documented in the leaked Conti playbooks.

MITRE ATT&CK: T1489 — Service Stop · T1562 — Impair Defenses

04 — Real Email Delivery via Postfix Mail Server

Difficulty: Medium

What we would add: Set up a Postfix mail server on Kali and configure the nurse workstation's Outlook client to receive mail from it. Deliver the phishing email directly to Nicole's actual Outlook inbox instead of just opening a browser to the email page manually.

Why it makes it more realistic: The current simulation skips the actual email delivery step entirely — the nurse just navigates directly to the phishing page in a browser. Real phishing attacks start in an actual email client. The victim has to notice the email, decide to click, and interact with it in a realistic way.

Real-world equivalent: Every major hospital ransomware attack starts with a phishing email landing in Outlook, Thunderbird, or webmail. This is the actual entry point for 91% of attacks and is currently the one step our simulation doesn't fully replicate.

MITRE ATT&CK: T1566 — Phishing · T1566.001 — Spearphishing Link

05 — C2 Communication: Command and Control Server

Difficulty: Hard

What we would add: Set up a basic command and control server on Kali using Metasploit or a custom Python listener. Have ransomware_sim.py phone home to the C2 server to receive an encryption key before locking files — simulating real ransomware key exchange and making recovery impossible without the attacker's cooperation.

Why it makes it more realistic: Real ransomware generates an encryption key, sends it to the attacker's C2 server, then encrypts files using that key. Without the key stored on the C2 server, the victim cannot recover their files even if they remove the ransomware. This is what creates the leverage that forces payment.

Real-world equivalent: REvil used Tor-based C2 infrastructure for key exchange. Victims had to connect to a dark web site to negotiate payment and receive decryption keys. Colonial Pipeline paid $4.4M and received a key — but it was so slow they used their own backups anyway.

MITRE ATT&CK: T1071 — Application Layer Protocol · T1573 — Encrypted Channel

06 — Behavioral Analytics: Anomaly Detection Rules

Difficulty: Hard

What we would add: Write additional Wazuh rules that detect unusual behavior patterns before the attack fully unfolds — unusual login times, abnormal file access volume, accessing folders the user account doesn't normally touch, and lateral movement indicators across multiple hosts.

Why it makes it more realistic: Our current detection is reactive — it fires when bad things happen. Proactive behavioral analytics can catch the attack earlier, potentially before files are locked, giving defenders a window to isolate the machine. This is the direction enterprise security is moving.

Real-world equivalent: Microsoft Defender for Identity and CrowdStrike Falcon use behavioral baselines to flag anomalous activity patterns. This kind of detection is standard in enterprise SOCs and is what separates mature security programs from basic log collection.

MITRE ATT&CK: T1078 — Valid Accounts · TA0043 — Reconnaissance

07 — Shadow Copy Deletion: Destroy Windows Backups

Difficulty: Easy

What we would add: Add a step in ransomware_sim.py that runs vssadmin delete shadows /all on both Windows VMs via smbclient before locking files. This eliminates Windows' built-in Volume Shadow Copy recovery points — removing the victim's ability to restore from Windows backups.

Why it makes it more realistic: Deleting shadow copies is one of the very first things real ransomware does — it removes the victim's ability to restore from Windows built-in backups, leaving them with no recovery option except paying the ransom or restoring from offline backups if they exist.

Real-world equivalent: Almost every major ransomware family — Ryuk, REvil, LockBit, Conti — deletes shadow copies as a standard first step before encryption. This is so common it is now a documented MITRE ATT&CK technique.

MITRE ATT&CK: T1490 — Inhibit System Recovery

08 — Third VM: Dedicated Wazuh Manager

Difficulty: Easy

What we would add: Add a dedicated Windows or Linux VM as a Wazuh manager, separate from the OVA approach, giving cleaner attacker / victim / defender separation. The attacker VM should not share a network segment with the SIEM in a realistic architecture.

Why it makes it more realistic: In real environments the SIEM is on a dedicated hardened machine isolated from the production network the attackers are targeting. Running the Wazuh OVA on the same bridged network as the attacker is architecturally unrealistic for a true purple team exercise.

Real-world equivalent: Enterprise SOCs run Splunk, Wazuh, or Elastic on dedicated hardened servers — isolated from the environments they monitor with strict network access controls.

MITRE ATT&CK: N/A — Architecture improvement

09 — Ransomware Decryption Simulation

Difficulty: Easy

What we would add: After the lockdown phase, add a restore flow that simulates receiving a decryption key from the attacker — showing the files being unlocked as if the ransom was paid. Then demonstrate the same result using the restore script to compare attacker recovery vs. independent recovery.

Why it makes it more realistic: The full story of ransomware includes the aftermath — negotiation, payment, and uncertain recovery. Showing the restore process from both angles demonstrates the attacker's leverage and makes the point that paying the ransom still doesn't guarantee full recovery.

Real-world equivalent: Colonial Pipeline paid $4.4M in ransom and received a decryption key — but the tool was so slow they used their own backups anyway, showing payment doesn't guarantee recovery and highlighting why offline backups are critical.

MITRE ATT&CK: T1486 — Data Encrypted for Impact

10 — Live Threat Intelligence Feed

Difficulty: Hard

What we would add: Integrate a live threat intelligence feed from AlienVault OTX or abuse.ch with Wazuh CDB lists. Automatically flag connections to known malicious IPs and domains in real time, adding automated IOC matching on top of the custom rule set.

Why it makes it more realistic: Real SOC teams use threat intelligence feeds to automatically cross-reference network traffic against known bad actors. This shows proactive threat hunting capabilities beyond just detecting activity happening inside the lab environment.

Real-world equivalent: Mandiant, CrowdStrike, and Recorded Future provide IOC feeds that are integrated into enterprise SIEMs to automatically block or alert on known attacker infrastructure. This is standard practice in mature security programs.

MITRE ATT&CK: T1071 — Application Layer Protocol · TA0011 — Command and Control

Priority Recommendations

For maximum impact with the least implementation effort, start here:

Priority	Area	Why
🥇 First	07 — Shadow Copy Deletion	One command, huge realism impact, easy to implement
🥈 Second	02 — Double Extortion	Shows the modern standard for ransomware attacks
🥉 Third	04 — Real Email Delivery	Closes the biggest gap in the current simulation
4th	03 — Anti-Forensics	Adds depth to the defender detection story
5th	01 — Network-Wide Propagation	Most impressive demo moment but hardest to build
Difficulty Reference
Level	Estimated Time
Easy	1–2 days
Medium	3–5 days
Hard	1+ week

St. Hera's Hospital — CyberLab Capstone Project All hospital names, patient data, and credentials are fictional — educational use only