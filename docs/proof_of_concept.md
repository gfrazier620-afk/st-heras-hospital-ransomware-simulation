Proof of Concept Guideline
Phishing-Initiated Hospital Ransomware Simulation

Lab Environment
The proof of concept will use three virtual machines:
Kali Linux attacker machine
Android virtual machine representing a nurse’s tablet
Windows Server 2022 representing the hospital patient-record server
The virtual machines will communicate through the VirtualBox network.

Phase 1: Verify the VirtualBox Network
Confirm that the three virtual machines can communicate with one another before building the rest of the project.
Steps:
Start Kali Linux, Android, and Windows Server.
Confirm that all three virtual machines are connected to the same VirtualBox network.
Find the automatically assigned IP address for each machine.
Record the addresses in a session worksheet.
Test communication between Kali and Windows Server.
Test whether Android can open a webpage hosted by Kali.
Tools Used:
VirtualBox network settings
ip address or ip route on Kali
ipconfig on Windows Server
Android web browser
Ping for connectivity testing

Phase 2: Build the Fictional Patient Server
The Windows Server Will Contain:
One fictional nurse account
An SMB file-sharing service
Fictional patient-record folders
Fictional patient documents
A separate disposable ransomware-demo folder
Fictional Account:
The script will create a lab-only account such as:
Employee name
Username
Role
Password
Fictional Patient Data:
The server will contain fictional departments such as:
Radiology
Cardiology
Oncology
Each department will contain fake patient folders and text documents.
Tools Used
Windows Server 2022
PowerShell setup script
Windows local user accounts
SMB file sharing
NTFS folder permissions

Permission Design:
Read access to the fictional patient records
Modify access only inside the dedicated RansomwareDemo folder
Expected Result:
The fictional nurse account
Fake hospital patient directories
Fictional patient records
The SMB patient-record share
The required file and folder permissions
A disposable ransomware-impact folder

Phase 3: Build the Phishing Email and Fake Portal
Create a hospital-themed phishing interaction that sends the fictional nurse to a fake password-reset page.
Phishing Email Design:
The simulated message will contain:
hospital branding
A hospital IT Support sender
A warning that the nurse’s clinical account will expire
A link labeled “Reset Clinical Portal Password”
Fake Portal Design:
The fake portal will resemble a fictional hospital employee password-reset page.
Employee username
Current password
New password
Password confirmation
After submission, the victim will see a message stating that the password was updated successfully.
The portal will not actually change the Windows password.
Tools Used:
Python 3
Python HTTP server
HTML
CSS
Web form
CSV capture log
Android web browser
Expected Result:
Android displays the simulated phishing message.
The nurse clicks the fake password-reset link.
The fake portal opens.
The fictional credentials are entered.
Kali records the fictional submission in a local lab file.
The victim sees a believable success message.

Phase 4: Capture the Lab Credentials
Demonstrate how credentials entered into a fake portal become available to the attacker.
Steps:
The victim submits the fictional nurse username and password.
The portal records the submission locally on Kali.
The attacker views the timestamp, source IP, username, and fictional password.
The captured information is saved as project evidence.
Tools Used:
Python form handler
CSV log file
Kali terminal
Expected Result:
The Kali attacker machine displays a lab-only record showing that the fictional nurse submitted credentials through the fake portal.
This represents credential theft caused by phishing.

Phase 5: Perform Controlled Reconnaissance
Demonstrate how an attacker searches the lab network for available systems and services after obtaining credentials.
The attacker will attempt to determine:
Which virtual machines are active?
Which IP address belongs to the patient server?
Which services are exposed?
Is the Windows SMB service available?
Can the captured fictional account authenticate?
Tools Used:
Nmap
Kali terminal
Saved Nmap output files

Phase 6: Use the Credentials to Access the Service
Demonstrate how stolen credentials may be reused against a hospital service.
Service Being Accessed:
The approved service will be the Windows SMB patient-record share.
The attacker will use the fictional nurse credentials to attempt authentication.
Tools Used:
smbclient
Windows SMB file-sharing service
Fictional nurse account
Steps:
The attacker lists the available SMB shares.
The attacker authenticates using the fictional nurse account.
The attacker connects to the PatientRecords share.
The attacker views the folders that the nurse account is permitted to access.
Expected Result:
The fictional credentials successfully authenticate to the patient-record service.
This demonstrates

Phase 7: Locate and Access Fictional Patient Records

Demonstrate the confidentiality impact of unauthorized access to hospital data.
Steps:
The attacker lists the available department folders.
The attacker enters one fictional patient folder.
The attacker identifies a fictional patient report.
The attacker copies one fictional record to Kali.
The attacker opens the copied file as proof of access.
Tools Used:
smbclient
Kali file system
Fictional text documents
Expected Result:
The attacker successfully locates and copies one fictional patient record.
This represents unauthorized access to sensitive hospital data.



Phase 8: Simulate Ransomware Impact
Demonstrate what ransomware impact could look like without creating or running real ransomware.
Dedicated Demo Folder:
The simulation will occur only inside:
RansomwareDemo
This folder will contain disposable copies of fictional files.
The attacker will:
Rename two or three disposable files
Add a .locked extension
Upload a simulated ransom-note text file
Display the changed folder contents


Phase 9: SIEM Investigation and Attack Reconstruction
Demonstrate how a defender could review centralized logs after the attack and reconstruct how the incident occurred.
Quistions the SIEM will answer:
When did the attack begin?
Which account was compromised?
Which system was accessed?
What patient files were viewed or copied?
Which files were renamed during the ransomware simulation?
What sequence of events led from phishing to data impact?










Setup host files for DNS 
Proof of Concept Success Criteria


