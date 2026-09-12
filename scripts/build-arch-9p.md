# Building Custom Arch Linux 32 Images for v86 (9P + Saved State)

This guide documents how to create an Arch Linux 32 image, convert its root filesystem to v86's VirtIO 9P HTTP chunk format, and capture a sub-second resume state (`.bin.zst`).

## 1. Prerequisites (Linux Host or Docker)

- QEMU (`qemu-system-i386`)
- `kpartx`, `losetup`, `rsync`, `zstd`
- Python 3 with `fs2json.py` and `copy-to-sha256.py` from [copy/v86 tools](https://github.com/copy/v86/tree/master/tools)

## 2. Bootstrapping Arch Linux 32

Create a virtual disk image:
```bash
qemu-img create -f raw arch32.img 2G
```

Boot the official [Arch Linux 32 ISO](https://archlinux32.org/download/):
```bash
qemu-system-i386 \
  -m 1024 \
  -drive file=arch32.img,format=raw \
  -cdrom archlinux32-2024.iso \
  -boot d \
  -enable-kvm
```

Inside the installer:
```bash
# Partition and format
fdisk /dev/sda  # Create single partition /dev/sda1
mkfs.ext4 /dev/sda1
mount /dev/sda1 /mnt

# Install base packages
pacstrap /mnt base linux-lts openrc vim bash zsh git curl wget python iproute2

# Configure autologin to tty1
cat << 'EOF' > /mnt/etc/systemd/system/getty@tty1.service.d/autologin.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty -o '-p -- \\u' --noclear --autologin root %I $TERM
EOF

umount -R /mnt
```

## 3. Converting to VirtIO 9P Web Chunks

Mount the raw image loopback and use v86's slicing tools:
```bash
LOOP_DEV=$(sudo losetup -f)
sudo losetup $LOOP_DEV arch32.img
sudo kpartx -a $LOOP_DEV
mkdir -p /mnt/archfs
sudo mount /dev/mapper/$(basename $LOOP_DEV)p1 /mnt/archfs

mkdir -p web-assets/arch

# Generate fs.json manifest
python3 tools/fs2json.py --out web-assets/fs.json /mnt/archfs

# Copy hashed chunks
python3 tools/copy-to-sha256.py /mnt/archfs web-assets/arch/

sudo umount /mnt/archfs
sudo kpartx -d $LOOP_DEV
sudo losetup -d $LOOP_DEV
```

## 4. Capturing the Memory Snapshot

1. Serve `web-assets/` via Cloudflare R2, S3, or Nginx.
2. In Browser Linux Lab, point the profile to your `fs.json` and chunks URL.
3. Cold boot the kernel once.
4. When the `root@arch ~ #` prompt appears, click **"Save State"** in the UI.
5. Compress the downloaded snapshot:
   ```bash
   zstd -19 v86state.bin -o arch_state-v3.bin.zst
   ```
6. Host `arch_state-v3.bin.zst` on your CDN. Users will now resume into Arch in under 2 seconds.
