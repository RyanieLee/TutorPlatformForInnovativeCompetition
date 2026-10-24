import ctypes,sys
x=ctypes.CDLL('libX11.so.6');t=ctypes.CDLL('libXtst.so.6')
x.XOpenDisplay.argtypes=[ctypes.c_char_p];x.XOpenDisplay.restype=ctypes.c_void_p
p=x.XOpenDisplay(sys.argv[1].encode());assert p
for name,args in [('XTestFakeMotionEvent',[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_ulong]),('XTestFakeButtonEvent',[ctypes.c_void_p,ctypes.c_uint,ctypes.c_int,ctypes.c_ulong])]:getattr(t,name).argtypes=args
x.XFlush.argtypes=[ctypes.c_void_p];x.XCloseDisplay.argtypes=[ctypes.c_void_p]
t.XTestFakeMotionEvent(p,-1,int(sys.argv[2]),int(sys.argv[3]),0);t.XTestFakeButtonEvent(p,1,1,0);t.XTestFakeButtonEvent(p,1,0,0);x.XFlush(p);x.XCloseDisplay(p)
