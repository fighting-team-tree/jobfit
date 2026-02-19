{pkgs}: {
  deps = [
    pkgs.python312
    pkgs.python312Packages.pip
    pkgs.ffmpeg
    pkgs.portaudio
    pkgs.pkg-config
    pkgs.libffi
    pkgs.openssl
    pkgs.uv
    pkgs.nodejs_20
  ];
}
