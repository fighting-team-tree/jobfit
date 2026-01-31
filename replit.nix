{pkgs}: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.ffmpeg
    pkgs.portaudio
    pkgs.pkg-config
    pkgs.libffi
    pkgs.openssl
    pkgs.uv
    pkgs.nodejs_20
  ];
}
