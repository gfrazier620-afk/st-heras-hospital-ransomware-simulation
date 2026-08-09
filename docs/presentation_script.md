St. Hera's Hospital — 6-Minute Presentation Script
Full Talking Script with Timing

Total time: 6:00 Team split: Each member speaks ~1.5 min minimum Format: Introduction → Story-Arc → What Went Well → Opportunities → Conclusion

PRE-PRESENTATION SETUP
Before were up:
All 4 VMs running
Watcher running on Kali: sudo bash /opt/ransomware-sim/watcher.sh
Dashboard open at CYBERLAB Security Monitor — Last 15 minutes
Nurse workstation browser at http://stherashospital.org/email.html
Demo files restored on both Windows VMs
Logs cleared: > /var/www/logs/creds.txt && > /var/www/logs/access.log

SLIDE 1 — TITLE
Speaker: Member 
Time: 0:00 – 0:30
(Let the boot sequence run. Once it finishes, press any key. Pause for effect as the title glitches in.)
"Good afternoon everyone. We are Garret Frazier, Majd Shouhy, and Zana Lee.
What you just watched was our lab booting up — four virtual machines coming online, attack modules loading, hospital systems connecting.
This is St. Hera's Hospital. A fictional hospital. A real attack simulation. And in about six minutes, you're going to watch us take it down completely — using nothing but a single phishing email."
(Advance to Slide 2.)

SLIDE 2 — INTRODUCTION
Speaker: Member 
Time: 0:30 – 1:15
"Here's the problem. Healthcare remains the most targeted sector for ransomware in the world. In 2025, over 445 U.S. healthcare providers were struck — forcing emergency rooms to divert patients, canceling surgeries, and exposing tens of millions of medical records.
And the most common entry point? Phishing emails and compromised user credentials.
Our solution was to build a complete, end-to-end hospital ransomware simulation from scratch — four virtual machines, eighteen custom Wazuh detection rules, a fully automated kill chain, and a live SIEM dashboard showing the attack from the defender's side in real time.
The major takeaway we want you to walk away with today is this — one employee's mistake can take down an entire hospital. Understanding exactly how that happens is the first step to stopping it."
(Advance to Slide 3.)

SLIDE 3 — LAB ENVIRONMENT
Speaker: Member 
Time: 1:15 – 1:45
"Here's what we built. Four virtual machines running on an isolated local network. Kali Linux is our attacker — running Apache, PHP, Python, and all our recon tools. WIN-NURSE-WORKSTATION is our victim — a Windows 11 machine where our fictional nurse Nicole Rivera works and where the phishing email lands. WIN-HOSPITAL-SERVER is our target — a Windows Server holding patient records in SMB file shares. And Wazuh is our SIEM — the defender's eye collecting logs from both Windows machines and firing alerts through our custom detection rules.
Everything here is completely fictional — the hospital, the patients, the nurse. All of this runs on our personal machines in a closed network. Nothing touches the internet."
(Advance to Slide 4.)

SLIDE 4 — STORY ARC / ATTACK CHAIN
Speaker: Member 
Time: 1:45 – 3:30
(This is the longest section — walk through each phase. You can run the live demo here OR describe it while showing the slide.)
"Let me tell you about Nicole Rivera.
Nicole is a registered nurse on the third floor of St. Hera's Hospital. On a Monday morning she opens her email and sees an urgent message from IT Security — her hospital portal account is about to be suspended. She needs to verify her credentials immediately or she'll lose access.
She clicks the link.
(Advance — Phase 01 lights up)
What she sees looks exactly like the hospital's real login page. She types in her username and password and clicks Verify Account.
(On Windows browser — navigate to http://stherashospital.org/email.html Click through and submit credentials)
(Advance — Phase 02 lights up)
The moment she hits submit — look at this terminal on Kali. Her username, her password, her IP address, her browser — all captured instantly.
She sees a success message. She thinks everything is fine. She has absolutely no idea what just happened.
(Advance — Phase 03 lights up)
Now we have credentials. The attacker runs nbtscan and Nmap across the network. Two machines appear — the nurse's workstation AND a hospital server at 192.168.0.237 with SMB port 445 wide open.
(Advance — Phase 04 lights up)
Here's the dangerous part. We take Nicole's stolen credentials — the same username and password she uses every day at work — and we authenticate directly to the hospital server. No exploit. No zero-day. Just stolen credentials reused against a different machine. We're inside the patient records.
(Run: smbclient //192.168.0.237/PatientRecords -U n.rivera%Summer2026! ls → cd Cardiology → get JohnDoe_chart.txt)
John Doe's cardiology chart is now sitting on the attacker's machine.
(Advance — Phase 05 lights up)
And then — because our watcher script detected Nicole's credential submission — the ransomware fires automatically in the background.
(Show Windows RansomwareDemo folder — files are now .locked)
Every file on BOTH machines is renamed with a .locked extension. A ransom note is delivered to both systems. And ten seconds later — the hospital portal goes completely dark.
(Try to refresh the browser — site can't be reached)
St. Hera's Hospital is locked down.
(Advance — Phase 06 lights up)
And all of this — from phishing click to full hospital lockdown — happened in under sixty seconds."
(Advance to Slide 5.)

SLIDE 5 — DEMO SCREENSHOTS
Speaker: Member 
Time: 3:30 – 4:00
(Point to screenshots or describe what happened if doing live demo)
"What you're seeing here is the evidence. The phishing email that looked legitimate. The credentials were captured on Kali the moment she clicked submit. The fake hospital dashboard she was redirected to while the attack ran silently behind her. The SMB connection accessing patient records. The .locked files on the hospital server. And the Wazuh dashboard — our SIEM — lighting up with critical alerts across every panel.
(Advance to Slide 6)
Every single one of those phases maps directly to real-world attack techniques documented by MITRE ATT&CK."

SLIDE 6 — MITRE ATT&CK
Speaker: Member 
Time: 4:00 – 4:25
(Table rows animate in — let them land before speaking)
"We mapped every phase of our simulation to the MITRE ATT&CK framework — the industry standard used by real SOC teams and threat intelligence analysts.
Phishing for initial access — T1566. Valid Accounts for lateral movement — T1078. Data Encrypted for Impact — T1486. Service Stop — T1489.
Nine techniques. All demonstrated in a single automated attack chain.
This isn't just a school project — this is the exact same playbook used by ransomware groups like LockBit and BlackCat against real hospitals."
(Advance to Slide 7.)

SLIDE 7 — WAZUH DETECTION RULES
Speaker: Member
Time: 4:25 – 5:00
(Watch the fake Wazuh alert popups fire in the top-right corner)
"Now let's talk about the defense side. We wrote eighteen custom Wazuh detection rules from scratch — covering every phase of the attack chain.
(Point to the alert popups appearing)
You can see alerts firing right now on this slide — those are simulated Wazuh notifications based on our actual rules. Rule 106 fires when a file gets renamed to .locked. Rule 107 fires when the ransom note drops. Rule 108 is our full attack chain correlation rule — it confirms the complete kill chain was executed. Rule 113 is mass encryption — fires when multiple files are locked within 30 seconds.
We also built a custom SOC analyst queue using the filter rule.groups:soc_queue — so a real analyst would only see the high-priority critical alerts, not the noise.
And we added CDB threat intelligence lists — Kali's IP is flagged as a suspicious destination, so any connection to it triggers an automatic alert."
(Advance to Slide 8.)

SLIDE 8 — WHAT WENT WELL + IMPROVEMENTS
Speaker: Member 
Time: 5:00 – 5:30
"Looking back at what went well — The full automation was the thing we're most proud of. One phishing click, and the entire kill chain fires automatically. The nurse never has to do anything else — the watcher script handles everything.
Level 2 lateral movement was a huge upgrade. We started with one Windows VM — our instructor saw the demo and challenged us to go bigger. So we added a second Windows VM as the dedicated hospital server, and now the ransomware locks down BOTH machines simultaneously. That's the moment you really feel the impact.
And the Wazuh SIEM detection — eighteen rules, nine dashboard panels, all firing in real time. That's a complete purple team exercise with both the red side and the blue side working.
For future work — we'd love to build Level 3, which is full network-wide propagation — scanning the subnet and automatically targeting every Windows machine found. That's how real ransomware worms actually spread. We'd also want to add double extortion — exfiltrating data BEFORE locking it — which is exactly what LockBit and BlackCat do."
(Advance to Slide 9.)

SLIDE 9 — CONCLUSION
Speaker: Member 
Time: 5:30 – 6:00
(Watch the 60-second countdown tick down)
"That countdown you're watching isn't a trick. That is the actual time it took — from the moment Nicole clicked that phishing email to the moment St. Hera's Hospital was completely locked down. Sixty seconds. One click. One employee.
Five things we want you to remember:
One — phishing is the number one ransomware entry point. Train your employees.
Two — credential reuse is catastrophic. Enable MFA everywhere.
Three — this attack took under sixty seconds. Detection has to be just as fast.
Four — detection is possible. Wazuh caught every single phase of this attack.
Five — defense in depth works. MFA alone would have stopped this. Email filtering alone would have stopped this. Network segmentation alone would have stopped this.
The attack chain we built is real. The techniques are real. The only thing fictional about this is the hospital.
Thank you."
(Take questions.)

TIMING SUMMARY
Section
Speaker
Slides
Time
Introduction
Member 
1 + 2
0:00 – 1:15
Lab Environment
Member 
3
1:15 – 1:45
Story-Arc + Demo
Members 
4 + 5
1:45 – 4:00
MITRE + Rules
Members 
6 + 7
4:00 – 5:00
Assessment + Conclusion
Members 
8 + 9
5:00 – 6:00


DEMO CHEAT SHEET (keep this tab open)
bash
# Kali Terminal 1 — watch creds land
tail -f /var/www/logs/creds.txt

# Kali Terminal 2 — watcher
sudo bash /opt/ransomware-sim/watcher.sh

# After creds captured — run recon
sudo nbtscan 192.168.0.0/24
nmap -sV 192.168.0.236 192.168.0.237

# Pivot to hospital server
smbclient //192.168.0.237/PatientRecords -U n.rivera%Summer2026!
# Inside: ls → cd Cardiology → get JohnDoe_chart.txt → exit

# After demo — restore everything
sudo python3 /opt/ransomware-sim/ransomware_sim.py --restore

IF SOMETHING BREAKS — RECOVERY LINES
Apache is down (expected after ransomware):
"And there it is — the hospital portal is completely unreachable. This is exactly what a ransomware attack looks like to every employee in the building."
Wazuh shows nothing:
"The detection rules are running in the background — let me pull up the raw alerts log to show you what Wazuh captured." grep "locked\|ransom\|attack" /var/ossec/logs/alerts/alerts.log | tail -20
VM not responding:
"While that loads — let me walk you through exactly what should be happening..." (continue with the script, buy time)
Files already locked (forgot to restore):
"You can see these files are already in the locked state from our last test run — which actually proves the point. Once ransomware hits, this is what you're left with."

All fictional — St. Hera's Hospital, Nicole Rivera, and all patient data are simulated. Lab environment only — isolated local network, no internet exposure.
