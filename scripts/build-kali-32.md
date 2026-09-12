# Building Kali Linux 2024.3 i386 for v86 Browser Lab

Kali Linux 2024.3 was the final release featuring official 32-bit x86 kernel packages and images ([Kali announcement](https://www.kali.org/blog/end-of-i386-kernel-and-images/)).

## 1. Obtaining Kali 2024.3 i386

Download the netinstaller or live ISO:
- URL: `https://old.kali.org/kali-images/kali-2024.3/`
- Image: `kali-linux-2024.3-installer-i386.iso` or live image.

## 2. Recommended Minimal Package Selection

Because v86 runs in WebAssembly without physical GPU or Wi-Fi hardware:
- **Exclude**: `kali-linux-wireless`, `aircrack-ng`, GPU crackers (`hashcat`), Bluetooth tools.
- **Include**:
  - Reconnaissance & Web: `nmap`, `curl`, `nikto`, `sqlmap`, `gobuster`, `dirb`
  - Networking & Tunnels: `netcat`, `socat`, `tcpdump`, `dnsutils`, `proxychains4`
  - Forensics & Crypto: `binwalk`, `radare2`, `gdb`, `tshark`, `john`
  - Desktop (GUI profile): `xfce4`, `lightdm`, `xfce4-terminal`

## 3. Snapshot Creation for Instant Browser Boot

1. Install Kali to an ext4 raw disk image using QEMU.
2. Enable root auto-login or passwordless user `kali:kali`.
3. Boot with v86 using minimal RAM: 768MB (CLI) or 1024MB (Desktop).
4. As soon as the terminal shell or XFCE desktop finishes loading:
   - Click **"Save State"** in the WebOS toolbar.
   - Compress with `zstd`:
     ```bash
     zstd -19 kali_state.bin -o kali_state.bin.zst
     ```
5. Place on your CDN pull-zone and update the profile URL.
