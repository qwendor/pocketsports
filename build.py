"""Stitch parts/*.{html,js} into index.html, syntax-check the script, copy to the Desktop."""
import subprocess, os, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
parts = sorted(f for f in os.listdir('parts'))
out = ''.join(open('parts/' + f, encoding='utf-8').read() for f in parts)
with open('index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(out)
r = subprocess.run(['node', 'check.js'], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip())
if r.returncode == 0:
    d = r'C:\Users\qwend\OneDrive\Desktop\PocketSports.html'
    shutil.copy('index.html', d)
    shutil.copy('art.js', os.path.join(os.path.dirname(d), 'art.js'))
    print('copied to', d, len(out.splitlines()), 'lines')
