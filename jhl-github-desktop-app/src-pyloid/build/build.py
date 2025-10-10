from pyloid_builder.pyinstaller import pyinstaller
from pyloid_builder.optimize import optimize
from pyloid.utils import get_platform
import os


main_script = './src-pyloid/main.py'
name = 'jhl-github-desktop'
dist_path = './dist'
work_path = './build'


# Icons (optional - will use if available)
if get_platform() == 'windows':
	icon = './src-pyloid/icons/icon.ico' if os.path.exists('./src-pyloid/icons/icon.ico') else None
elif get_platform() == 'macos':
	icon = './src-pyloid/icons/icon.icns' if os.path.exists('./src-pyloid/icons/icon.icns') else None
else:
	icon = './src-pyloid/icons/icon.png' if os.path.exists('./src-pyloid/icons/icon.png') else None
 
if get_platform() == 'windows':
    optimize_spec = './src-pyloid/build/windows_optimize.spec'
elif get_platform() == 'macos':
    optimize_spec = './src-pyloid/build/macos_optimize.spec'
else:
    optimize_spec = './src-pyloid/build/linux_optimize.spec'



if __name__ == '__main__':
	# Build pyinstaller options
	options = [
		f'--name={name}',
		f'--distpath={dist_path}',
		f'--workpath={work_path}',
		'--clean',
		'--noconfirm',
		'--onedir',
		'--windowed',
		'--add-data=./dist-front/:./dist-front/',
		'--add-data=./backend/app/:./app/',
	]

	# Add icons if available
	if os.path.exists('./src-pyloid/icons/'):
		options.append('--add-data=./src-pyloid/icons/:./src-pyloid/icons/')

	if icon:
		options.append(f'--icon={icon}')

	pyinstaller(main_script, options)
 
	if get_platform() == 'windows':
		optimize(f'{dist_path}/{name}/_internal', optimize_spec)
	elif get_platform() == 'macos':
		optimize(f'{dist_path}/{name}.app', optimize_spec)
	else:
		optimize(f'{dist_path}/{name}/_internal', optimize_spec)
