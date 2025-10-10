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
	# Hidden imports for FastAPI and dependencies
	hidden_imports = [
		'fastapi',
		'fastapi.middleware',
		'fastapi.middleware.cors',
		'fastapi.staticfiles',
		'fastapi.responses',
		'starlette',
		'starlette.middleware',
		'starlette.middleware.cors',
		'starlette.staticfiles',
		'starlette.responses',
		'uvicorn',
		'uvicorn.logging',
		'uvicorn.loops',
		'uvicorn.loops.auto',
		'uvicorn.protocols',
		'uvicorn.protocols.http',
		'uvicorn.protocols.http.auto',
		'uvicorn.protocols.websockets',
		'uvicorn.protocols.websockets.auto',
		'uvicorn.lifespan',
		'uvicorn.lifespan.on',
		'pydantic',
		'pydantic_core',
		'pydantic_settings',
		'httpx',
		'anyio',
		'sniffio',
	]

	# Build pyinstaller options
	options = [
		f'--name={name}',
		f'--distpath={dist_path}',
		f'--workpath={work_path}',
		'--clean',
		'--noconfirm',
		'--onefile',  # Single executable file
		'--windowed',
		'--add-data=./dist-front/:./dist-front/',
		'--add-data=./backend/app/:./app/',
	]

	# Add hidden imports
	for module in hidden_imports:
		options.append(f'--hidden-import={module}')

	# Add icons if available
	if os.path.exists('./src-pyloid/icons/'):
		options.append('--add-data=./src-pyloid/icons/:./src-pyloid/icons/')

	if icon:
		options.append(f'--icon={icon}')

	pyinstaller(main_script, options)

	# No optimization needed for onefile mode
