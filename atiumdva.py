import time
import struct
import psutil
import ctypes
import win32gui
import win32con
import win32api
import win32process
import math
import imgui
import threading
import glfw
import OpenGL.GL as gl
import json
import os
import random
import re
import requests
import io
import sys
import winsound
from PIL import Image
from imgui.integrations.glfw import GlfwRenderer
from ctypes import wintypes
import lupa
from lupa import LuaRuntime
import pyperclip
import subprocess
from supabase import create_client, Client
from google import genai
import platform
kernel32 = ctypes.WinDLL("kernel32")
user32 = ctypes.WinDLL("user32")
ntdll = ctypes.WinDLL("ntdll.dll")
hWnd_console = kernel32.GetConsoleWindow()
if hWnd_console:
    user32.ShowWindow(hWnd_console, 0)

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for Nuitka/PyInstaller """
    try:
        if hasattr(sys, 'frozen'):
            # In Nuitka standalone/onefile, looking next to the EXE
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)
def is_admin():
    try: return ctypes.windll.shell32.IsUserAnAdmin()
    except: return False



def set_debug_privilege():
    try:
        advapi32 = ctypes.WinDLL("advapi32")
        class LUID(ctypes.Structure):
            _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]
        class LUID_AND_ATTRIBUTES(ctypes.Structure):
            _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]
        class TOKEN_PRIVILEGES(ctypes.Structure):
            _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]
        advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
        advapi32.LookupPrivilegeValueW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, ctypes.POINTER(LUID)]
        advapi32.AdjustTokenPrivileges.argtypes = [wintypes.HANDLE, wintypes.BOOL, ctypes.POINTER(TOKEN_PRIVILEGES), wintypes.DWORD, ctypes.c_void_p, ctypes.c_void_p]
        h_token = wintypes.HANDLE()
        if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0020 | 0x0008, ctypes.byref(h_token)):
            luid = LUID()
            if advapi32.LookupPrivilegeValueW(None, "SeDebugPrivilege", ctypes.byref(luid)):
                tp = TOKEN_PRIVILEGES()
                tp.PrivilegeCount = 1
                tp.Privileges[0].Luid = luid
                tp.Privileges[0].Attributes = 0x00000002
                advapi32.AdjustTokenPrivileges(h_token, False, ctypes.byref(tp), 0, None, None)
            kernel32.CloseHandle(h_token)
    except: pass
set_debug_privilege()
def anti_debug():
    blacklist = ["x64dbg.exe", "x32dbg.exe", "cheatengine-x86_64.exe", "cheatengine-i386.exe", "cheat engine.exe", "ollydbg.exe", "wireshark.exe", "processhacker.exe", "hacker.exe", "ida64.exe", "idaw.exe", "ida.exe", "scylla.exe"]
    while True:
        if kernel32.IsDebuggerPresent(): os._exit(0)
        remote_dbg = wintypes.BOOL(False)
        if kernel32.CheckRemoteDebuggerPresent(kernel32.GetCurrentProcess(), ctypes.byref(remote_dbg)):
            if remote_dbg.value: os._exit(0)
        for p in psutil.process_iter(['name']):
            try:
                if p.info['name'].lower() in blacklist: os._exit(0)
            except: pass
        # Latency check removed to prevent false positives on laggy systems
        time.sleep(2)
# threading.Thread(target=anti_debug, daemon=True).start()
ntdll.NtReadVirtualMemory.argtypes = [wintypes.HANDLE, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
ntdll.NtReadVirtualMemory.restype = ctypes.c_long
ntdll.NtWriteVirtualMemory.argtypes = [wintypes.HANDLE, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
ntdll.NtWriteVirtualMemory.restype = ctypes.c_long
ntdll.NtOpenProcess.argtypes = [ctypes.POINTER(wintypes.HANDLE), wintypes.DWORD, ctypes.c_void_p, ctypes.c_void_p]
ntdll.NtOpenProcess.restype = ctypes.c_long
SHOULD_EXIT = False
GL_HWND = None
LOGGED_IN = False
CHEAT_STARTED = False
USER_HWID = ""
def get_hwid():
    try:
        cmd = [
            "powershell",
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_ComputerSystemProduct).UUID"
        ]
        uuid = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()

        if uuid:
            return uuid
        else:
            raise Exception("Empty UUID")

    except Exception:
        return f"UNKNOWN-HWID-{random.randint(1000, 9999)}"

USER_HWID = get_hwid()

def get_roblox_version_dynamic():
    """Dynamically find Roblox version by checking the parent folder of RobloxPlayerBeta.exe"""
    try:
        for proc in psutil.process_iter(['name', 'exe']):
            if proc.info['name'] == 'RobloxPlayerBeta.exe':
                exe_path = proc.info['exe']
                if exe_path:
                    # Folder name is the version (e.g. version-xxxxxxxx)
                    return os.path.basename(os.path.dirname(exe_path))
    except: pass
    return "Unknown"

def send_discord_log(username, hwid, status="Login Success"):
    WEBHOOK_URL = "https://discord.com/api/webhooks/1465957621210026056/cKy-oxFME2ZF5r4KdQX4WhP6GINI32zdchiKjUP4yEs6PMYVdBm9zQ8RiODnR-_42DR1"
    def _send():
        try:
            hw_info = f"CPU: {platform.processor()} | RAM: {round(psutil.virtual_memory().total / (1024**3), 2)} GB"
            rbx_v = get_roblox_version_dynamic()

            payload = {
                "embeds": [{
                    "title": "Glycon External - Intelligence Log",
                    "color": 0xFF0000 if "Tampering" in status else (0x8A2BE2 if "Success" in status else 0x00FF00),
                    "thumbnail": {"url": "https://64.media.tumblr.com/fc31230cb3b71bd34bf832aabba85b91/30a11c6187407b06-be/s540x810/32c216a47ab901a121aee86eefdc0b6788bb4a0e.pnj"},
                    "fields": [
                        {"name": "User", "value": f"`{username or 'Uknown'}`", "inline": True},
                        {"name": "Status", "value": f"`{status}`", "inline": True},
                        {"name": "HWID", "value": f"```\n{hwid}\n```", "inline": False},
                        {"name": "Game Version", "value": f"`{rbx_v}`", "inline": True},
                        {"name": "System Info", "value": f"`{hw_info}`", "inline": False},
                        {"name": "Timestamp", "value": f"<t:{int(time.time())}:R>", "inline": True}
                    ],
                    "footer": {"text": "Glycon Premium | Security & Logging"}
                }]
            }
            requests.post(WEBHOOK_URL, json=payload, timeout=10)
        except: pass
    threading.Thread(target=_send, daemon=True).start()
SUPABASE_URL = "https://txpmghnjcaoojmomxhry.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_tBAnI45AOKPD3_NpEDqeZw_75uBZxwh"
SUPABASE: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
# Auth State: LOGIN, KEY_SYSTEM, SUCCESS_TRIAL, SUCCESS_PAID, HWID
AUTH_STATE = "LOGIN"
ROBLOX_USERNAME = ""
KEY_INPUT = ""
AUTH_ERROR = ""
IS_SUBMITTING = False
IS_TRIAL_USER = False
SECURITY_CLEAR = True
SECURITY_LOCK = threading.Lock()
LAST_SECURITY_TIMESTAMP = 0
# Transition Animation for auth screens
AUTH_TRANSITION_X = 0.0
AUTH_TRANSITION_ALPHA = 1.0
# Legacy compat (keep for integrity checks)
USER_EMAIL = ""
USER_PASS = ""
# Animation Globals
LOGIN_ANIM_Y = 0.0
LOGIN_ANIM_ALPHA = 0.0
MENU_ANIM_PROGRESS = 0.0
MENU_ANIM_TYPE = 0
MENU_ANIM_TOTAL_TYPES = 6
MENU_WAS_OPEN = True # Start true if MENU_OPEN is true
STREAM_PROOF_ENABLED = False
LUA_DRAWINGS = []
LUA_DRAWING_LOCK = threading.Lock()
EXPLORER_ICONS = {} # {classname: texture_id}
EXPLORER_ICON_DATA = {} # {classname: (w, h, bytes)}
EXPLORER_ICONS_PATH = get_resource_path("Workspace")

def render_lua_drawings(draw_list):
    """Render 2D shapes managed by the Lua Drawing library"""
    with LUA_DRAWING_LOCK:
        for d in LUA_DRAWINGS[:]:
            if not d.get('Visible', False): continue
            
            try:
                dtype = d.get('Type')
                color = d.get('Color', [1.0, 1.0, 1.0])
                trans = d.get('Transparency', 1.0)
                col_u32 = imgui.get_color_u32_rgba(color[0], color[1], color[2], trans)
                thick = d.get('Thickness', 1.0)
                
                if dtype == "Line":
                    f, t = d.get('From', {'x':0, 'y':0}), d.get('To', {'x':0, 'y':0})
                    draw_list.add_line(f['x'], f['y'], t['x'], t['y'], col_u32, thick)
                
                elif dtype == "Circle":
                    p = d.get('Position', {'x':0, 'y':0})
                    r = d.get('Radius', 10.0)
                    sides = int(d.get('NumSides', 32))
                    if d.get('Filled', False):
                        draw_list.add_circle_filled(p['x'], p['y'], r, col_u32, sides)
                    else:
                        draw_list.add_circle(p['x'], p['y'], r, col_u32, sides, thick)
                
                elif dtype == "Square":
                    p = d.get('Position', {'x':0, 'y':0})
                    s = d.get('Size', {'x':0, 'y':0})
                    rounding = d.get('Corner', 0.0)
                    if d.get('Filled', False):
                        draw_list.add_rect_filled(p['x'], p['y'], p['x'] + s['x'], p['y'] + s['y'], col_u32, rounding)
                    else:
                        draw_list.add_rect(p['x'], p['y'], p['x'] + s['x'], p['y'] + s['y'], col_u32, rounding, thickness=thick)
                
                elif dtype == "Triangle":
                    pa, pb, pc = d.get('PointA', {'x':0, 'y':0}), d.get('PointB', {'x':0, 'y':0}), d.get('PointC', {'x':0, 'y':0})
                    if d.get('Filled', False):
                        draw_list.add_triangle_filled(pa['x'], pa['y'], pb['x'], pb['y'], pc['x'], pc['y'], col_u32)
                    else:
                        draw_list.add_triangle(pa['x'], pa['y'], pb['x'], pb['y'], pc['x'], pc['y'], col_u32, thick)
                
                elif dtype == "Text":
                    p = d.get('Position', {'x':0, 'y':0})
                    txt = str(d.get('Text', ""))
                    font_size = d.get('Size', 14.0)
                    if d.get('Outline', False):
                        # Simple 4-way outline
                        out_col = imgui.get_color_u32_rgba(0, 0, 0, trans)
                        draw_list.add_text(p['x']-1, p['y'], out_col, txt)
                        draw_list.add_text(p['x']+1, p['y'], out_col, txt)
                        draw_list.add_text(p['x'], p['y']-1, out_col, txt)
                        draw_list.add_text(p['x'], p['y']+1, out_col, txt)
                    
                    if d.get('Center', False):
                        # Naive centering (ImGui usually needs calc_text_size but it's hard here)
                        # We'll just shift it roughly based on char count for now
                        p['x'] -= (len(txt) * font_size * 0.25)
                        
                    draw_list.add_text(p['x'], p['y'], col_u32, txt)
            except Exception as e:
                pass

def save_local_auth(roblox_username, key=""):
    """Save auth data in new format: roblox_username:key:HWID"""
    global AUTH_ERROR
    try:
        path = "C:\\Windows\\System32\\config\\sys_auth.cfg"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({
                "roblox_username": roblox_username.strip(), 
                "key": key.strip(), 
                "hwid": USER_HWID, 
                "is_trial": IS_TRIAL_USER
            }, f)
    except Exception as e:
        AUTH_ERROR = f"Persist Error: {str(e)}"

def load_local_auth():
    """Load auth data and return (roblox_username, key) tuple"""
    try:
        path = "C:\\Windows\\System32\\config\\sys_auth.cfg"
        if os.path.exists(path):
            with open(path, "r") as f:
                try:
                    data = json.load(f)
                    # New format
                    if "roblox_username" in data:
                        return data.get("roblox_username", "").strip(), data.get("key", "").strip(), data.get("is_trial", False)
                except:
                    pass
                # Legacy format - return empty (force re-login)
                return "", "", False
    except: pass
    return "", "", False

def validate_free_trial_key(key_input):
    """Validate key against Supabase config (key_hyperion)"""
    try:
        res = SUPABASE.table('glycon_config').select('config_value').eq('config_key', 'key_hyperion').execute()
        if res.data:
            db_key = res.data[0].get('config_value', '')
            return db_key.strip() == key_input.strip()
        return False
    except:
        return False

def check_global_suspension(show_msg=True):
    """Consolidated suspension check logic."""
    try:
        res = SUPABASE.table('glycon_config').select('config_value').eq('config_key', 'suspend_status').execute()
        if res.data and str(res.data[0].get('config_value')) != '1':
            if show_msg:
                ctypes.windll.user32.MessageBoxW(0, "Seems like Developers have restricted Glycon from being used at this time of the day, please refer to our Discord server for more information", "Glycon Security", 0x10)
            return False
    except: pass
    return True

def security_heartbeat_worker():
    """Background worker to check Supabase status without lagging UI."""
    global SECURITY_CLEAR, ROBLOX_USERNAME, LOGGED_IN, IS_TRIAL_USER
    while True:
        try:
            # 1. Check Global Suspension (Consolidated)
            if not check_global_suspension(show_msg=True):
                with SECURITY_LOCK: SECURITY_CLEAR = False
                os._exit(0)
            
            # 2. Check if user still exists in claims (If logged in and NOT a trial user)
            # Trial users are not in the claims table, so we skip this check for them.
            if ROBLOX_USERNAME and LOGGED_IN and not IS_TRIAL_USER:
                res = SUPABASE.table('glycon_claims').select('roblox_username').eq('roblox_username', ROBLOX_USERNAME).execute()
                if not res.data:
                    # Account removed from Supabase - Exit instantly
                    with SECURITY_LOCK: SECURITY_CLEAR = False
                    os._exit(0)
            
            with SECURITY_LOCK: SECURITY_CLEAR = True
        except: pass
        time.sleep(5) # Check every 5 seconds for aggressive enforcement

def perform_security_check(forced=False):
    """Hidden event track. File integrity is checked instantly, Supabase is backgrounded."""
    global ROBLOX_USERNAME, SECURITY_CLEAR
    if not ROBLOX_USERNAME: return
    
    # 1. Local Integrity Check (Fast - happens in memory/disk)
    if not tight_integrity_check():
        send_discord_log(ROBLOX_USERNAME, USER_HWID, "Tampering Detected - Integrity Failure")
        os._exit(0)
    
    # 2. Check local flag (instant)
    if not SECURITY_CLEAR:
        os._exit(0)
        
    # 3. Trigger immediate background update if forced
    if forced:
        threading.Thread(target=lambda: security_heartbeat_worker(), daemon=True).start()

# Start the heartbeat worker
threading.Thread(target=security_heartbeat_worker, daemon=True).start()

def check_system_hwid():
    """Verify HWID matches database on every run"""
    global ROBLOX_USERNAME, USER_HWID
    perform_security_check()
    try:
        res = SUPABASE.table('glycon_claims').select('hwid').eq('roblox_username', ROBLOX_USERNAME).execute()
        if res.data:
            db_hwid = res.data[0].get('hwid')
            if db_hwid and db_hwid != USER_HWID:
                os._exit(0)
    except: pass

def check_paid_account(roblox_username):
    """Check if username exists in glycon_claims table and handle HWID"""
    global USER_HWID
    try:
        # Use .execute() instead of .single() to avoid error on 0 rows
        result = SUPABASE.from_('glycon_claims').select('hwid').eq('roblox_username', roblox_username).execute()
        if result.data and len(result.data) > 0:
            db_hwid = result.data[0].get('hwid', '')
            if not db_hwid or db_hwid == '':  # Empty HWID - register this device
                SUPABASE.from_('glycon_claims').update({'hwid': USER_HWID}).eq('roblox_username', roblox_username).execute()
                return True, "REGISTERED"
            elif db_hwid == USER_HWID:  # Matching HWID
                return True, "VALID"
            else:  # Different HWID - account already registered to another device
                return False, "HWID_MISMATCH"
        return False, "NOT_FOUND"
    except Exception as e:
        # Log error to file for debugging
        try:
            with open("c:\\Users\\nevin\\Desktop\\imgui\\errors.txt", "a") as f:
                f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] check_paid_account error: {str(e)}\n")
        except: pass
        return False, f"ERROR: {str(e)}"
RIVALS_LAST_LBUTTON_STATE = False
RIVALS_ORIGINAL_ROT = None
CURRENT_PLACE_ID = 0
def get_anchor_paths():
    return [
        "C:\\Windows\\System32\\drivers\\en-US\\gly_sys.bin",
        "C:\\Windows\\System32\\spool\\drivers\\color\\gly_v.dat",
        "C:\\Windows\\System32\\oobe\\sys_gl_auth.cfg",
        "C:\\Windows\\System32\\speech\\common\\win_gl.dat"
    ]
def maintain_integrity(roblox_username, key=""):
    """Write auth data to 4 anchor paths. Deletes old files first."""
    global USER_HWID
    try:
        paths = get_anchor_paths()
        # Delete old auth files first
        for p in paths:
            try:
                if os.path.exists(p): os.remove(p)
            except: pass
        # New format: roblox_username:key:HWID
        auth_str = f"{roblox_username}:{key}:{USER_HWID}"
        for p in paths[:2]:
            try:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w") as f: f.write(auth_str)
            except: pass
        for p in paths[2:]:
            try:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w") as f: f.write("VERIFIED_SESSION")
            except: pass
    except: pass

def check_integrity(roblox_username, key=""):
    """Verify auth data in anchor paths using new format."""
    global USER_HWID
    try:
        u = roblox_username.strip()
        k = key.strip()
        paths = get_anchor_paths()
        auth_str = f"{u}:{k}:{USER_HWID}"
        valid_content = 0
        for p in paths[:2]:
            if os.path.exists(p):
                try:
                    with open(p, "r") as f:
                        if f.read().strip() == auth_str: valid_content += 1
                except: pass
        exists_count = 0
        for p in paths[2:]:
            if os.path.exists(p): exists_count += 1
        return valid_content >= 1 and exists_count >= 1
    except: return False


def tight_integrity_check():
    """Strict check for all 4 anchor files using new format."""
    global ROBLOX_USERNAME, KEY_INPUT, USER_HWID, IS_TRIAL_USER
    try:
        u = ROBLOX_USERNAME.strip()
        k = KEY_INPUT.strip() if IS_TRIAL_USER else ""
        paths = get_anchor_paths()
        
        # Build auth string based on user type
        auth_str = f"{u}:{k}:{USER_HWID}"
        
        # Check integrity of data files
        valid_data = 0
        for p in paths[:2]:
            if os.path.exists(p):
                with open(p, "r") as f:
                    if f.read().strip() == auth_str: valid_data += 1
        
        # Check existence of marker files
        valid_marker = 0
        for p in paths[2:]:
            if os.path.exists(p): valid_marker += 1
            
        return valid_data >= 1 and valid_marker >= 1
    except: return False

# Remove duplicate maintain_integrity - already defined above
# Remove duplicate check_integrity - already defined above

def integrity_worker():
    global ROBLOX_USERNAME, KEY_INPUT, LOGGED_IN, SHOULD_EXIT, IS_TRIAL_USER
    time.sleep(20)
    while not SHOULD_EXIT:
        if LOGGED_IN and ROBLOX_USERNAME:
            # Refresh integrity files before checking
            key = KEY_INPUT if IS_TRIAL_USER else ""
            maintain_integrity(ROBLOX_USERNAME, key) 
            if not check_integrity(ROBLOX_USERNAME, key):
                time.sleep(5)
                if not check_integrity(ROBLOX_USERNAME, key):
                    os._exit(0) # Security Exit: Integrity violation
            maintain_integrity(ROBLOX_USERNAME, key)
        time.sleep(10)

def check_system_hwid():
    try:
        paths = get_anchor_paths()
        for p in paths[:2]:
            if os.path.exists(p):
                with open(p, "r") as f:
                    data = f.read().strip().split(":")
                    if len(data) > 2: return data[2]
    except: pass
    return ""
def supabase_login(identifier, password):
    global AUTH_ERROR, AUTH_STATE, IS_SUBMITTING, LOGGED_IN, USER_EMAIL, USER_PASS
    try:
        effective_email = identifier if '@' in identifier else f"{identifier.lower().replace(' ', '')}@glycon.internal"
        res = SUPABASE.auth.sign_in_with_password({"email": effective_email, "password": password})
        if res.user:
            profile = SUPABASE.from_('profiles').select('hwid').eq('id', res.user.id).single().execute()
            db_hwid = profile.data.get('hwid') if profile.data else None
            if not db_hwid:
                 USER_EMAIL = identifier
                 USER_PASS = password
                 save_local_auth(identifier, password)
                 AUTH_STATE = "HWID"
                 send_discord_log(identifier, USER_HWID, status="Account Linked (Pending HWID)")
                 return True

            if db_hwid != USER_HWID:
                 AUTH_ERROR = "HWID Mismatch. Account linked to another system."
                 SUPABASE.auth.sign_out()
                 return False
            USER_EMAIL = identifier
            USER_PASS = password
            save_local_auth(identifier, password)
            maintain_integrity(identifier, password)
            saved_hw = check_system_hwid()
            if saved_hw == USER_HWID:
                AUTH_STATE = "SUCCESS"
                LOGGED_IN = True
                send_discord_log(identifier, USER_HWID, status="Login Success")
                return True
            else:
                AUTH_STATE = "HWID"
                return True
    except Exception as e:
        AUTH_ERROR = str(e).split(":")[-1].strip()
    return False
def tray_handler():
    global SHOULD_EXIT, MENU_OPEN
    def on_tray(hwnd, msg, wparam, lparam):
        if msg == win32con.WM_USER + 20:
            if lparam == win32con.WM_RBUTTONUP:
                menu = win32gui.CreatePopupMenu()
                win32gui.AppendMenu(menu, win32con.MF_STRING, 1, "Open UI")
                win32gui.AppendMenu(menu, win32con.MF_STRING, 2, "Unload Cheat")
                win32gui.AppendMenu(menu, win32con.MF_STRING, 3, "Exit Cheat")
                pos = win32gui.GetCursorPos()
                win32gui.SetForegroundWindow(hwnd)
                sel = win32gui.TrackPopupMenu(menu, win32con.TPM_LEFTALIGN | win32con.TPM_RETURNCMD, pos[0], pos[1], 0, hwnd, None)
                if sel == 1:
                    MENU_OPEN = True
                    set_clickable(GL_HWND, True)
                elif sel == 2:
                    SHOULD_EXIT = True
                elif sel == 3:
                    win32gui.Shell_NotifyIcon(win32gui.NIM_DELETE, (hwnd, 0))
                    os._exit(0)
                win32gui.PostMessage(hwnd, win32con.WM_NULL, 0, 0)
            elif lparam == win32con.WM_LBUTTONUP:
                MENU_OPEN = not MENU_OPEN
                set_clickable(GL_HWND, MENU_OPEN)
        return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)
    wc = win32gui.WNDCLASS()
    wc.lpfnWndProc = on_tray
    wc.lpszClassName = "GlyconTray"
    wc.hInstance = win32api.GetModuleHandle(None)
    class_atom = win32gui.RegisterClass(wc)
    hwnd = win32gui.CreateWindow(class_atom, "GlyconTray", 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)
    ico_path = os.path.join(os.getcwd(), "ya.ico")
    if os.path.exists(ico_path): hicon = win32gui.LoadImage(0, ico_path, win32con.IMAGE_ICON, 0, 0, win32con.LR_LOADFROMFILE | win32con.LR_DEFAULTSIZE)
    else: hicon = win32gui.LoadIcon(0, win32con.IDI_APPLICATION)
    nid = (hwnd, 0, 0x00000001 | 0x00000002 | 0x00000004, win32con.WM_USER + 20, hicon, "Glycon")
    win32gui.Shell_NotifyIcon(win32gui.NIM_ADD, nid)
    while not SHOULD_EXIT:
        win32gui.PumpWaitingMessages()
        time.sleep(0.1)
    win32gui.Shell_NotifyIcon(win32gui.NIM_DELETE, (hwnd, 0))
dwmapi = ctypes.WinDLL("dwmapi")
def select_file_dialog():
    """Native Windows file picker using comdlg32.dll"""
    global GL_HWND
    class OPENFILENAME(ctypes.Structure):
        _fields_ = [
            ("lStructSize", ctypes.c_uint32),
            ("hwndOwner", ctypes.c_void_p),
            ("hInstance", ctypes.c_void_p),
            ("lpstrFilter", ctypes.c_wchar_p),
            ("lpstrCustomFilter", ctypes.c_wchar_p),
            ("nMaxCustFilter", ctypes.c_uint32),
            ("nFilterIndex", ctypes.c_uint32),
            ("lpstrFile", ctypes.c_wchar_p),
            ("nMaxFile", ctypes.c_uint32),
            ("lpstrFileTitle", ctypes.c_wchar_p),
            ("nMaxFileTitle", ctypes.c_uint32),
            ("lpstrInitialDir", ctypes.c_wchar_p),
            ("lpstrTitle", ctypes.c_wchar_p),
            ("Flags", ctypes.c_uint32),
            ("nFileOffset", ctypes.c_uint16),
            ("nFileExtension", ctypes.c_uint16),
            ("lpstrDefExt", ctypes.c_wchar_p),
            ("lCustData", ctypes.c_void_p),
            ("lpfnHook", ctypes.c_void_p),
            ("lpTemplateName", ctypes.c_wchar_p),
            ("pvReserved", ctypes.c_void_p),
            ("dwReserved", ctypes.c_uint32),
            ("FlagsEx", ctypes.c_uint32),
        ]
    fn = OPENFILENAME()
    fn.lStructSize = ctypes.sizeof(fn)
    fn.hwndOwner = GL_HWND
    fn.lpstrFilter = "Images\0*.png;*.jpg;*.jpeg\0All Files\0*.*\0\0"
    file_buffer = ctypes.create_unicode_buffer(260)
    fn.lpstrFile = ctypes.cast(file_buffer, ctypes.c_wchar_p)
    fn.nMaxFile = 260
    fn.Flags = 0x00000800 | 0x00000008 | 0x00000004
    if ctypes.windll.comdlg32.GetOpenFileNameW(ctypes.byref(fn)):
        return file_buffer.value
    return None
class MARGINS(ctypes.Structure):
    _fields_ = [("cxLeftWidth", wintypes.INT), ("cxRightWidth", wintypes.INT),
                ("cyTopHeight", wintypes.INT), ("cyBottomHeight", wintypes.INT)]
def make_window_transparent(hwnd):
    style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
    new_style = (style | win32con.WS_EX_LAYERED | win32con.WS_EX_TRANSPARENT | win32con.WS_EX_TOOLWINDOW) & ~win32con.WS_EX_APPWINDOW
    win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, new_style)
    win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0, win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    margins = MARGINS(-1, -1, -1, -1)
    ctypes.windll.dwmapi.DwmExtendFrameIntoClientArea(hwnd, ctypes.byref(margins))
def hide_from_taskbar(hwnd):
    style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
    style = (style | win32con.WS_EX_TOOLWINDOW) & ~win32con.WS_EX_APPWINDOW
    win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, style)
    win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0, win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_SHOWWINDOW)
def set_clickable(hwnd, clickable):
    if not hwnd: return
    try:
        style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
        if clickable:
            new_style = style & ~win32con.WS_EX_TRANSPARENT
        else:
            new_style = style | win32con.WS_EX_TRANSPARENT
        if style != new_style:
            win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, new_style)
            margins = MARGINS(-1, -1, -1, -1)
            ctypes.windll.dwmapi.DwmExtendFrameIntoClientArea(hwnd, ctypes.byref(margins))
            win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0, win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_SHOWWINDOW)
            if clickable:
                try: win32gui.SetForegroundWindow(hwnd)
                except: pass
    except Exception as e: pass
class GlyconNotification:
    def __init__(self, text, stagger=0.0, uid=0, category="Success"):
        self.text = text
        self.spawn_time = time.time() + stagger
        self.lifetime = 3.5
        self.fade_duration = 0.5
        self.w, self.h = 320, 60
        self.uid = uid
        self.category = category
ACTIVE_NOTIFICATIONS = [
    GlyconNotification("+ Welcome to Glycon", stagger=0.6),
    GlyconNotification("+ glycon.vercel.app", stagger=0.8),
    GlyconNotification("+ vBETA RELEASE", stagger=0.10),
    GlyconNotification("+ press insert to open UI", stagger=0.12)
]
def render_glycon_notifications(draw_list, sw, sh):
    curr_t = time.time()
    base_y = sh - 100
    for i, n in enumerate(ACTIVE_NOTIFICATIONS[:]):
        if curr_t < n.spawn_time: continue
        elapsed = curr_t - n.spawn_time
        if elapsed > n.lifetime + n.fade_duration:
            ACTIVE_NOTIFICATIONS.remove(n)
            continue
        alpha = 1.0
        slide_off = 0
        if elapsed < n.fade_duration:
            alpha = elapsed / n.fade_duration
            slide_off = (1.0 - alpha) * 100
        elif elapsed > n.lifetime:
            alpha = 1.0 - (elapsed - n.lifetime) / n.fade_duration
            slide_off = (1.0 - alpha) * -50
        card_w, card_h = n.w, n.h
        pad_x = 25
        nx = sw - card_w - pad_x
        ny = base_y - (i * (card_h + 15)) + slide_off
        bg_col = imgui.get_color_u32_rgba(0.06, 0.05, 0.08, alpha * 0.98)
        border_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha * 0.6)
        draw_list.add_rect_filled(nx + 5, ny + 5, nx + card_w + 5, ny + card_h + 5, imgui.get_color_u32_rgba(0, 0, 0, alpha * 0.4), 12.0)
        draw_list.add_rect_filled(nx, ny, nx + card_w, ny + card_h, bg_col, 12.0)
        draw_list.add_rect(nx, ny, nx + card_w, ny + card_h, border_col, 12.0, thickness=1.5)
        text_x = nx + 15
        if n.uid and n.uid > 0:
            thumb_size = 40
            tx, ty = nx + 10, ny + (card_h - thumb_size) / 2
            draw_list.add_rect_filled(tx, ty, tx + thumb_size, ty + thumb_size, imgui.get_color_u32_rgba(0.12, 0.10, 0.16, alpha), 8.0)
            draw_list.add_rect(tx, ty, tx + thumb_size, ty + thumb_size, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha * 0.8), 8.0, thickness=1.0)
            tex_id = None
            if n.uid in PLAYER_THUMBNAIL_CACHE:
                tex_id = PLAYER_THUMBNAIL_CACHE[n.uid].get('texture')
            if tex_id:
                draw_list.add_image(tex_id, (tx + 2, ty + 2), (tx + thumb_size - 2, ty + thumb_size - 2), (0, 0), (1, 1), imgui.get_color_u32_rgba(1, 1, 1, alpha))
            else:
                draw_list.add_circle_filled(tx + thumb_size/2, ty + thumb_size/2, 12, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha * 0.3))
            text_x = nx + 60
        else:
            icon_x = nx + 25
            icon_y = ny + card_h / 2
            draw_list.add_circle_filled(icon_x, icon_y, 14, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha * 0.2), num_segments=24)
            draw_list.add_circle(icon_x, icon_y, 14, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha * 0.8), num_segments=24, thickness=1.5)
            cx, cy = icon_x, icon_y
            checkmark_col = imgui.get_color_u32_rgba(0.20, 0.85, 0.50, alpha)
            draw_list.add_line(cx - 5, cy + 1, cx - 2, cy + 5, checkmark_col, 2.0)
            draw_list.add_line(cx - 2, cy + 5, cx + 6, cy - 4, checkmark_col, 2.0)
            text_x = nx + 55
        draw_list.add_text(text_x, ny + 12, imgui.get_color_u32_rgba(1, 1, 1, alpha), n.text)
        draw_list.add_text(text_x, ny + 32, imgui.get_color_u32_rgba(0.7, 0.7, 0.8, alpha * 0.8), n.category)
        if elapsed <= n.lifetime:
            prog = 1.0 - (elapsed / n.lifetime)
            draw_list.add_rect_filled(nx + 10, ny + card_h - 4, nx + 10 + (card_w - 20) * prog, ny + card_h - 2, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, alpha), 2.0)

# ============================================================================
# AI ASSISTANT IMPLEMENTATION
# ============================================================================
AI_MESSAGES = []  # Chat history: [{"role": "user"/"assistant", "content": "..."}]
AI_INPUT = ""  # Current user input
AI_BUSY = False  # Processing state
AI_TERMS_ACCEPTED = False  # Terms acceptance
AI_CLIENT = None  # Genai client instance

# Professional system prompt with feature knowledge
AI_SYSTEM_PROMPT = """You are Glycon AI, a professional assistant for the Glycon external cheat software for Roblox.

COMMUNICATION STYLE:
- Be professional, concise, and helpful
- Avoid excessive punctuation (no "??", "!!!", or "...")
- Use clear, direct language
- Be knowledgeable about all cheat features

CHEAT FEATURES YOU CAN CONFIGURE:
When the user asks for a configuration, respond with a friendly message AND include a hidden command tag.

AIMBOT: AIMBOT_ENABLED, SMOOTHNESS (1-50), AIM_FOV (10-800), TARGET_PART_INDEX (0=Head, 1=HRP, 2=Torso), PREDICTION_ENABLED, STICKY_AIM, TEAM_CHECK
TRIGGERBOT: TRIGGERBOT_ENABLED, trigger_delay (0-1)
ESP: SHOW_ESP, SHOW_NAMES, SHOW_HEALTH, SHOW_SKELETON, SHOW_TRACERS, SHOW_DISTANCE, SHOW_CORNERS, SHOW_FILLED_BOX
CHARACTER: TOGGLE_WS, WALKSPEED_VAL (0-500), TOGGLE_JP, JUMPPOWER_VAL (0-500), TOGGLE_FLY, FLY_SPEED (0.1-10)
SILENT AIM: SILENT_AIM_ENABLED, SILENT_AIM_FOV, SILENT_AIM_SMOOTHNESS
EXTRAS: HITBOX_EXPANDER_ENABLED, HITBOX_SIZE_VAL, SPINBOT_ENABLED, SPINBOT_SPEED
ADDICT: ADDICT_ANTI_STOMP_ENABLED, ADDICT_RAGE_ENABLED, ADDICT_RAGE_ORBIT_SPEED

CONFIG PRESETS:
- "streamable" = Subtle settings: low FOV, no rage, minimal ESP (names + health only), low smoothness
- "blatant" = Full power: high FOV, all ESP, rage mode, silent aim
- "legit" = Careful settings: low FOV, no silent aim, only box ESP, high smoothness
- "hvh" or "rage" = Maximum aggression: lowest smoothness, all aim features, rage orbit

COMMAND FORMAT:
To apply settings, include this EXACT format in your response (it will be hidden from user):
[CMD:SET_CONFIG:{"VARIABLE_NAME": value, "ANOTHER_VAR": value}]

Example response for "give me a streamable config":
"I've configured a streamable setup for you. ESP is set to show only names and health bars with a subtle appearance. Aimbot FOV is reduced to avoid obvious movements.
[CMD:SET_CONFIG:{"SHOW_ESP": false, "SHOW_NAMES": true, "SHOW_HEALTH": true, "SHOW_SKELETON": false, "AIMBOT_ENABLED": true, "AIM_FOV": 80, "SMOOTHNESS": 15.0, "SILENT_AIM_ENABLED": false, "ADDICT_RAGE_ENABLED": false}]"

Always be helpful and explain what settings you're applying."""

def init_ai_client():
    """Initialize the Google Genai client"""
    global AI_CLIENT
    try:
        # Using the genai client with default API key from environment or hardcoded
        AI_CLIENT = genai.Client(api_key="AIzaSyD9JLNzwQU-example-key")  # Replace with actual key
    except Exception as e:
        AI_CLIENT = None

def apply_ai_config(config_dict):
    """Apply configuration from AI response to global variables"""
    global AIMBOT_ENABLED, SMOOTHNESS, AIM_FOV, TARGET_PART_INDEX, PREDICTION_ENABLED
    global STICKY_AIM, TEAM_CHECK, TRIGGERBOT_ENABLED, trigger_delay
    global SHOW_ESP, SHOW_NAMES, SHOW_HEALTH, SHOW_SKELETON, SHOW_TRACERS, SHOW_DISTANCE
    global SHOW_CORNERS, SHOW_FILLED_BOX, TOGGLE_WS, WALKSPEED_VAL, TOGGLE_JP, JUMPPOWER_VAL
    global TOGGLE_FLY, FLY_SPEED, SILENT_AIM_ENABLED, SILENT_AIM_FOV, SILENT_AIM_SMOOTHNESS
    global HITBOX_EXPANDER_ENABLED, HITBOX_SIZE_VAL, SPINBOT_ENABLED, SPINBOT_SPEED
    global ADDICT_ANTI_STOMP_ENABLED, ADDICT_RAGE_ENABLED, ADDICT_RAGE_ORBIT_SPEED
    
    try:
        for key, value in config_dict.items():
            if key in globals():
                globals()[key] = value
        ACTIVE_NOTIFICATIONS.append(GlyconNotification("AI Config Applied", category="AI"))
    except Exception as e:
        ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Config Error: {str(e)}", category="Error"))

def send_ai_chat():
    """Send user message to AI and process response"""
    global AI_MESSAGES, AI_INPUT, AI_BUSY
    
    if not AI_INPUT.strip() or AI_BUSY:
        return
    
    user_msg = AI_INPUT.strip()
    AI_INPUT = ""
    AI_MESSAGES.append({"role": "user", "content": user_msg})
    AI_BUSY = True
    
    def _process():
        global AI_MESSAGES, AI_BUSY
        try:
            # Build conversation for API
            messages = [{"role": "user", "parts": [{"text": AI_SYSTEM_PROMPT + "\n\nUser: " + user_msg}]}]
            
            # Include recent history for context
            if len(AI_MESSAGES) > 1:
                history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in AI_MESSAGES[-6:-1]])
                messages[0]["parts"][0]["text"] = AI_SYSTEM_PROMPT + "\n\nRecent conversation:\n" + history_text + "\n\nUser: " + user_msg
            
            # Call Genai API
            if AI_CLIENT:
                response = AI_CLIENT.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=messages
                )
                ai_response = response.text if response.text else "I apologize, I could not generate a response."
            else:
                # Fallback if client not initialized
                ai_response = "AI client not initialized. Please check API configuration."
            
            # Parse for config commands
            cmd_match = re.search(r'\[CMD:SET_CONFIG:(\{[^}]+\})\]', ai_response)
            if cmd_match:
                try:
                    config_json = cmd_match.group(1)
                    config_dict = json.loads(config_json)
                    apply_ai_config(config_dict)
                except:
                    pass
            
            AI_MESSAGES.append({"role": "assistant", "content": ai_response})
        except Exception as e:
            AI_MESSAGES.append({"role": "assistant", "content": f"Error processing request: {str(e)}"})
        finally:
            AI_BUSY = False
    
    threading.Thread(target=_process, daemon=True).start()

# Initialize AI client on load
init_ai_client()

class Snowflake:
    def __init__(self, sw, sh):
        self.sw = sw
        self.sh = sh
        self.reset()
    def reset(self):
        self.x = random.uniform(0, self.sw)
        self.y = random.uniform(-self.sh, 0)
        self.size = random.uniform(1.0, 3.5)
        self.speed = random.uniform(20.0, 100.0)
        self.drift = random.uniform(-1.0, 1.0)
        self.opacity = random.uniform(0.3, 0.8)
    def update(self, dt):
        self.y += self.speed * dt
        self.x += self.drift
        if self.y > self.sh:
            self.reset()
def render_snowflakes(draw_list, snowflakes, dt):
    color_base = [1.0, 1.0, 1.0]
    for s in snowflakes:
        s.update(dt)
        color = imgui.get_color_u32_rgba(color_base[0], color_base[1], color_base[2], s.opacity)
        draw_list.add_circle_filled(s.x, s.y, s.size, color, num_segments=8)
def apply_advanced_theme(opacity=None):
    global MENU_OPACITY
    if opacity is None: opacity = MENU_OPACITY
    style = imgui.get_style()
    style.window_rounding = 16.0
    style.child_rounding = 12.0
    style.frame_rounding = 10.0
    style.grab_rounding = 10.0
    style.popup_rounding = 12.0
    style.scrollbar_rounding = 12.0
    style.window_padding = imgui.Vec2(0, 0)
    style.item_spacing = imgui.Vec2(12, 14)
    style.frame_padding = imgui.Vec2(8, 6)
    style.window_border_size = 1.0
    style.child_border_size = 1.0
    c = style.colors
    c[imgui.COLOR_WINDOW_BACKGROUND] = [0.03, 0.03, 0.04, opacity]
    c[imgui.COLOR_CHILD_BACKGROUND]  = [0.05, 0.05, 0.07, opacity]
    c[imgui.COLOR_BORDER]            = [0.18, 0.14, 0.28, 1.00]
    c[imgui.COLOR_TEXT]              = [0.95, 0.95, 0.98, 1.00]
    c[imgui.COLOR_TEXT_DISABLED]     = [0.50, 0.45, 0.60, 1.00]
    purple_base   = [0.54, 0.17, 0.89, 1.00]
    purple_hover  = [0.68, 0.35, 1.00, 1.00]
    purple_active = [0.45, 0.10, 0.80, 1.00]
    c[imgui.COLOR_BUTTON]            = [0.08, 0.08, 0.12, 1.00]
    c[imgui.COLOR_BUTTON_HOVERED]    = purple_hover
    c[imgui.COLOR_BUTTON_ACTIVE]     = purple_active
    c[imgui.COLOR_FRAME_BACKGROUND]  = [0.09, 0.08, 0.14, 1.00]
    c[imgui.COLOR_FRAME_BACKGROUND_HOVERED] = [0.15, 0.12, 0.22, 1.00]
    c[imgui.COLOR_FRAME_BACKGROUND_ACTIVE]  = [0.20, 0.15, 0.30, 1.00]
    c[imgui.COLOR_SLIDER_GRAB]       = purple_base
    c[imgui.COLOR_SLIDER_GRAB_ACTIVE] = purple_active
    c[imgui.COLOR_CHECK_MARK]        = purple_base
    c[imgui.COLOR_HEADER]            = [0.15, 0.10, 0.25, 0.85]
    c[imgui.COLOR_HEADER_HOVERED]    = [0.25, 0.15, 0.40, 1.00]
    c[imgui.COLOR_HEADER_ACTIVE]     = purple_base
    c[imgui.COLOR_SEPARATOR]         = [0.18, 0.14, 0.28, 0.60]
    c[imgui.COLOR_SEPARATOR_HOVERED] = purple_hover
    c[imgui.COLOR_SEPARATOR_ACTIVE]  = purple_active
O_FAKE_DATAMODEL_PTR = 0x7FA1988
O_FAKE_DM_TO_REAL_DM = 0x1C0
O_VISUAL_ENGINE_PTR  = 0x7A7F950
O_VIEW_MATRIX        = 0x4B0
O_WORKSPACE          = 0x178
O_CHILDREN           = 0x70
O_CHILDREN_END       = 0x8
O_PARENT             = 0x68
O_NAME               = 0xB0
O_STRING_LENGTH      = 0x10
O_CLASS_DESCRIPTOR   = 0x18
O_CLASS_NAME_PTR     = 0x8
O_LOCAL_PLAYER       = 0x130
O_MODEL_INSTANCE     = 0x370
O_PRIMITIVE          = 0x148
O_POSITION           = 0xE4
O_ROTATION           = 0xC8
O_VELOCITY           = 0xF0
O_WALKSPEED          = 0x1D4
O_WALKSPEED_CHECK    = 0x3C0
O_HIP_HEIGHT         = 0x1A0
O_JUMP_POWER         = 0x1B0
O_JUMPPOWER_CHECK    = 0x39C
O_HEALTH             = 0x194
O_MAX_HEALTH         = 0x1B4
O_CAMERA             = 0x460
O_CAMERA_SUBJECT     = 0xE8
O_CAMERA_ROT         = 0xF8
O_CAMERA_POS         = 0x11C
O_CFRAME             = 0xC0
O_VISIBLE            = 0x94
O_TEXT_COLOR         = 0xED8
O_BACKGROUND_COLOR   = 0x558
O_MOUSE_SERVICE      = 0x3E0
O_CLICK_DETECTOR     = 0xD0
O_TOUCH_INTEREST     = 0xD0
O_CAN_COLLIDE        = 0x1A5
M_CAN_COLLIDE        = 0x08
M_CAN_TOUCH          = 0x10
O_CLOCK_TIME         = 0x1B8
O_GRAVITY            = 0x9B8
O_FOV                = 0x160
O_FOG_START          = 0x138
O_FOG_END            = 0x134
O_FOG_COLOR          = 0xFC
O_LIGHTING_SKY       = 0x1D8
O_LIGHTING_ATMOS     = 0x1E8
O_ATMOS_COLOR        = 0xD0
O_ATMOS_DECAY        = 0xDC
O_ATMOS_DENSITY      = 0xE8
O_ATMOS_GLARE        = 0xEC
O_ATMOS_HAZE         = 0xF0
O_ATMOS_OFFSET       = 0xF4
O_SKY_BK             = 0x110
O_SKY_DN             = 0x140
O_SKY_FT             = 0x170
O_SKY_LF             = 0x1A0
O_SKY_RT             = 0x1D0
O_SKY_UP             = 0x200
O_TEAM               = 0x280
O_ANCHORED           = 0x1A5
M_ANCHORED           = 0x02
O_PLAYER_MOUSE       = 0xCE8
O_USER_ID            = 0x2B8
O_HUMANOID_STATE     = 0x8D8
O_HUMANOID_STATE_ID  = 0x20
O_FFLAG_LIST         = 0x7A96EB8
O_FFLAG_VAL          = 0x30
O_GAME_ID            = 0x190
O_PLACE_ID           = 0x198
O_MOUSE_POSITION      = 0xEC
O_MOUSE_HIT_POS      = 0x114
O_INPUT_OBJECT       = 0x110
O_FRAME_VISIBLE      = 0x5C1
O_FRAME_POS_X        = 0x528
O_FRAME_POS_OFFSET_X = 0x52C
O_TRANSPARENCY       = 0xF0
O_VALUE              = 0xD0
O_WORKSPACE_TO_WORLD = 0x3D8
O_SIZE               = 0x1B0
O_CAN_TOUCH          = 0x1AE
O_TEXT               = 0xE28
O_CURRENT_CAMERA     = 0x460
O_MESH_ID            = 0x2E8
O_GET_SET_IMPL       = 0x90
O_CORE_GUI           = 0x330
O_PROPERTY_DESCRIPTOR = 0x2C0
O_OVERLAP            = 0x200
O_PRINT              = 0x1737F30
O_RESUME             = 0x848
O_REFLECTION_LIMIT   = 0x6781BE0
O_TICK_RATE          = 0x658
O_VIEWPORT           = 0x2ac
O_DIMENSIONS         = 0x720
O_AMBIENT            = 0xD8
O_OUTDOOR_AMBIENT    = 0x108
O_BRIGHTNESS         = 0x120
O_COLOR_SHIFT_BOT    = 0xE4
O_COLOR_SHIFT_TOP    = 0xF0
O_ENV_DIFFUSE        = 0x10C
O_ENV_SPECULAR       = 0x128
O_RENDER_VIEW        = 0x800
O_INVALIDATE_LIGHT   = 0x148
class vec2:
    def __init__(self, x=0.0, y=0.0): self.x, self.y = x, y
class vec3:
    def __init__(self, x=0.0, y=0.0, z=0.0): self.x, self.y, self.z = x, y, z
class CLIENT_ID(ctypes.Structure):
    _fields_ = [("UniqueProcess", ctypes.c_void_p), ("UniqueThread", ctypes.c_void_p)]
class OBJECT_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Length", ctypes.c_ulong),
        ("RootDirectory", ctypes.c_void_p),
        ("ObjectName", ctypes.c_void_p),
        ("Attributes", ctypes.c_ulong),
        ("SecurityDescriptor", ctypes.c_void_p),
        ("SecurityQualityOfService", ctypes.c_void_p),
    ]
class Syscall:
    def __init__(self):
        self.kernel32 = ctypes.WinDLL("kernel32")
        self.ntdll = ctypes.WinDLL("ntdll")
        self.kernel32.GetProcAddress.restype = ctypes.c_void_p
        self.kernel32.GetProcAddress.argtypes = [wintypes.HANDLE, ctypes.c_char_p]
        self.kernel32.GetModuleHandleW.restype = wintypes.HANDLE
        self.kernel32.GetModuleHandleW.argtypes = [wintypes.LPCWSTR]
        self.kernel32.VirtualAlloc.restype = ctypes.c_void_p
        self.kernel32.VirtualAlloc.argtypes = [ctypes.c_void_p, ctypes.c_size_t, wintypes.DWORD, wintypes.DWORD]
        self.ssns = {}
        self.stubs = {}
        self.initialize_ssns()
    def get_ssn(self, name):
        h_nt = self.kernel32.GetModuleHandleW("ntdll.dll")
        addr = self.kernel32.GetProcAddress(h_nt, name.encode())
        if not addr: return None
        data = ctypes.string_at(addr, 32)
        if data[0] == 0x4C and data[1] == 0x8B and data[2] == 0xD1 and data[3] == 0xB8:
            return struct.unpack("<I", data[4:8])[0]
        elif data[0] == 0xE9:
            for i in range(1, 400):
                n_addr = addr + (i * 32)
                p_addr = addr - (i * 32)
                n_data = ctypes.string_at(n_addr, 32)
                if n_data[0] == 0x4C and n_data[1] == 0x8B and n_data[2] == 0xD1 and n_data[3] == 0xB8:
                    return struct.unpack("<I", n_data[4:8])[0] - i
                p_data = ctypes.string_at(p_addr, 32)
                if p_data[0] == 0x4C and p_data[1] == 0x8B and p_data[2] == 0xD1 and p_data[3] == 0xB8:
                    return struct.unpack("<I", p_data[4:8])[0] + i
        return None
    def initialize_ssns(self):
        sys_funcs = {
            "NtOpenProcess": 4,
            "NtReadVirtualMemory": 5,
            "NtWriteVirtualMemory": 5,
            "NtCreateSection": 7,
            "NtMapViewOfSection": 10,
            "NtUnmapViewOfSection": 2,
            "NtClose": 1,
            "NtSystemDebugControl": 6,
            "NtAllocateVirtualMemory": 6
        }
        for name, arg_count in sys_funcs.items():
            ssn = self.get_ssn(name)
            if ssn is not None:
                self.ssns[name] = ssn
                self.stubs[name] = self.create_stub(ssn, arg_count)
    def create_stub(self, ssn, arg_count):
        shellcode = b"\x4C\x8B\xD1\xB8" + struct.pack("<I", ssn) + b"\x0F\x05\xC3"
        size = len(shellcode)
        addr = self.kernel32.VirtualAlloc(None, size, 0x3000, 0x40)
        if not addr: return None
        ctypes.memmove(addr, shellcode, size)
        arg_types = [ctypes.c_void_p] * arg_count
        return ctypes.CFUNCTYPE(ctypes.c_long, *arg_types)(addr)
SYSCALL_MGR = Syscall()
class MODULEENTRY32(ctypes.Structure):
    _fields_ = [("dwSize", wintypes.DWORD), ("th32ModuleID", wintypes.DWORD),
                ("th32ProcessID", wintypes.DWORD), ("GlblcntUsage", wintypes.DWORD),
                ("ProccntUsage", wintypes.DWORD), ("modBaseAddr", ctypes.POINTER(wintypes.BYTE)),
                ("modBaseSize", wintypes.DWORD), ("hModule", wintypes.HMODULE),
                ("szModule", ctypes.c_char * 256), ("szExePath", ctypes.c_char * 260)]
class robloxmemory:
    def __init__(self):
        self.hwnd = None
        self.service_cache = {}
        self.last_dm = 0
        if not self.find_roblox():
            print("Roblox not found. Continuing without process...")
        self.initialize_data()
    def find_roblox(self):
        def enum_proc(hwnd, results):
            try:
                if not win32gui.IsWindowVisible(hwnd): return True
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                if psutil.Process(pid).name().lower() == "robloxplayerbeta.exe": results.append((hwnd, pid))
            except: pass
            return True
        res = []
        win32gui.EnumWindows(enum_proc, res)
        if not res: return False
        self.hwnd, self.process_id = res[0]
        try:
            if win32gui.IsIconic(self.hwnd):
                win32gui.ShowWindow(self.hwnd, win32con.SW_RESTORE)
            win32gui.SystemParametersInfo(win32con.SPI_SETFOREGROUNDLOCKTIMEOUT, 0, win32con.SPIF_SENDWININICHANGE | win32con.SPIF_UPDATEINIFILE)
            win32gui.SetForegroundWindow(self.hwnd)
        except: pass
        if hasattr(self, 'process_handle') and self.process_handle:
            kernel32.CloseHandle(self.process_handle)
        self.process_handle = wintypes.HANDLE()
        cid = CLIENT_ID(ctypes.c_void_p(self.process_id), None)
        obj = OBJECT_ATTRIBUTES(ctypes.sizeof(OBJECT_ATTRIBUTES), None, None, 0, None, None)
        status = SYSCALL_MGR.stubs["NtOpenProcess"](ctypes.byref(self.process_handle), 0x0438, ctypes.byref(obj), ctypes.byref(cid))
        if status != 0 or not self.process_handle: return False
        snapshot = kernel32.CreateToolhelp32Snapshot(0x8 | 0x10, self.process_id)
        entry = MODULEENTRY32(); entry.dwSize = ctypes.sizeof(MODULEENTRY32)
        self.base_address = 0
        if ctypes.windll.kernel32.Module32First(snapshot, ctypes.byref(entry)):
            while True:
                if entry.szModule.decode().lower() == "robloxplayerbeta.exe":
                    self.base_address = ctypes.addressof(entry.modBaseAddr.contents); break
                if not ctypes.windll.kernel32.Module32Next(snapshot, ctypes.byref(entry)): break
        kernel32.CloseHandle(snapshot)
        return self.base_address != 0
    def is_alive(self):
        if not self.process_handle: return False
        if not win32gui.IsWindow(self.hwnd): return False
        exit_code = wintypes.DWORD()
        kernel32.GetExitCodeProcess(self.process_handle, ctypes.byref(exit_code))
        return exit_code.value == 259
    def read_mem(self, addr, size):
        if not addr or addr < 0x10000 or addr > 0x7FFFFFFFFFFF: return b'\x00' * size
        buf = ctypes.create_string_buffer(size)
        read = ctypes.c_size_t()
        SYSCALL_MGR.stubs["NtReadVirtualMemory"](self.process_handle, ctypes.c_void_p(addr), buf, size, ctypes.byref(read))
        return buf.raw
    def write_mem(self, addr, data):
        if not addr or addr < 0x10000 or addr > 0x7FFFFFFFFFFF: return False
        written = ctypes.c_size_t()
        return SYSCALL_MGR.stubs["NtWriteVirtualMemory"](self.process_handle, ctypes.c_void_p(addr), data, len(data), ctypes.byref(written)) == 0
    def get_class_name(self, addr):
        if not addr: return ""
        desc = self.read_ptr(addr + O_CLASS_DESCRIPTOR)
        if desc:
            name_ptr = self.read_ptr(desc + O_CLASS_NAME_PTR)
            if name_ptr: return self.read_str(name_ptr)
        return ""
    def read_ptr(self, addr):
        return int.from_bytes(self.read_mem(addr, 8), 'little')
    def read_str(self, addr):
        if not addr: return ""
        length = int.from_bytes(self.read_mem(addr + O_STRING_LENGTH, 4), 'little')
        if length >= 16: addr = self.read_ptr(addr)
        return self.read_mem(addr, length).decode(errors='ignore').split('\0')[0]
    def write_str(self, addr, text):
        if not addr: return False
        try:
            data = text.encode() + b'\x00'
            length = len(data) - 1
            if length < 16:
                self.write_mem(addr, data)
                self.write_mem(addr + O_STRING_LENGTH, struct.pack('Q', length))
                self.write_mem(addr + O_STRING_LENGTH + 8, struct.pack('Q', 15)) # Set capacity for short string
            else:
                base_addr = ctypes.c_void_p(0)
                region_size = ctypes.c_size_t(length + 1)
                status = SYSCALL_MGR.stubs["NtAllocateVirtualMemory"](
                    self.process_handle,
                    ctypes.byref(base_addr),
                    0,
                    ctypes.byref(region_size),
                    0x1000 | 0x2000,
                    0x40
                )
                if status == 0 and base_addr.value:
                    alloc_addr = base_addr.value
                    self.write_mem(alloc_addr, data)
                    self.write_mem(addr, struct.pack('Q', alloc_addr))
                    self.write_mem(addr + O_STRING_LENGTH, struct.pack('Q', length))
                    self.write_mem(addr + O_STRING_LENGTH + 8, struct.pack('Q', length))
            return True
        except: return False
    def write_gravity(self, gravity):
        if not self.workspace: return
        gravity_container = self.read_ptr(self.workspace + O_WORKSPACE_TO_WORLD)
        if not gravity_container: return
        self.write_mem(gravity_container + O_GRAVITY, struct.pack('f', gravity))
    def read_gravity(self):
        if not self.workspace: return 0.0
        gravity_container = self.read_ptr(self.workspace + O_WORKSPACE_TO_WORLD)
        if not gravity_container: return 0.0
        val = self.read_mem(gravity_container + O_GRAVITY, 4)
        if val: return struct.unpack('f', val)[0]
        return 0.0
    def initialize_data(self):
        fake_dm = self.read_ptr(self.base_address + O_FAKE_DATAMODEL_PTR)
        dm = self.read_ptr(fake_dm + O_FAKE_DM_TO_REAL_DM)
        self.data_model = dm
        self.visual_engine = self.read_ptr(self.base_address + O_VISUAL_ENGINE_PTR)
        
        # Service Caching Logic: Drastically reduces lag by avoiding redundant find_class scans
        if dm != self.last_dm:
            self.service_cache.clear()
            self.last_dm = dm
            
        def get_service(name):
            if name not in self.service_cache:
                self.service_cache[name] = self.find_class(dm, name)
            return self.service_cache[name]

        self.players = get_service("Players")
        self.lighting = get_service("Lighting")
        self.mouse_service = get_service("MouseService")
        self.replicated_storage = get_service("ReplicatedStorage")
        self.workspace = self.read_ptr(dm + O_WORKSPACE) # Workspace usually has direct offset
        self.local_player = self.read_ptr(self.players + O_LOCAL_PLAYER)
        
        try:
            p_id_raw = self.read_mem(dm + O_PLACE_ID, 8)
            globals()['CURRENT_PLACE_ID'] = struct.unpack('Q', p_id_raw)[0] if p_id_raw else 0
        except: globals()['CURRENT_PLACE_ID'] = 0
    def find_class(self, parent, name, recursive=True):
        if not parent: return 0
        ptr = self.read_ptr(parent + O_CHILDREN)
        if not ptr: return 0
        curr, end = self.read_ptr(ptr), self.read_ptr(ptr + O_CHILDREN_END)
        # Size sanity check
        if end <= curr or (end - curr) > 200000: return 0
        
        candidates = []
        count = 0
        while curr < end and count < 8000:
            count += 1
            child = self.read_ptr(curr)
            if child:
                desc = self.read_ptr(child + O_CLASS_DESCRIPTOR)
                if desc:
                    name_ptr = self.read_ptr(desc + O_CLASS_NAME_PTR)
                    if name_ptr and self.read_str(name_ptr) == name: return child
                if recursive: candidates.append(child)
            curr += 16
            
        if recursive:
            for cand in candidates:
                res = self.find_class(cand, name, True)
                if res: return res
        return 0
    def get_children(self, parent):
        if not parent: return []
        children = []
        ptr = self.read_ptr(parent + O_CHILDREN)
        if not ptr: return []
        curr, end = self.read_ptr(ptr), self.read_ptr(ptr + O_CHILDREN_END)
        if end <= curr or (end - curr) > 80000: return []
        count = 0
        while curr < end and count < 5000:
            count += 1
            child = self.read_ptr(curr)
            if child: children.append(child)
            curr += 16
        return children
    def find_child_name(self, parent, name):
        for child in self.get_children(parent):
            name_ptr = self.read_ptr(child + O_NAME)
            if name_ptr and self.read_str(name_ptr) == name: return child
        return 0
    def world_to_screen(self, pos, vm, w, h):
        qx = (pos.x * vm[0]) + (pos.y * vm[1]) + (pos.z * vm[2]) + vm[3]
        qy = (pos.x * vm[4]) + (pos.y * vm[5]) + (pos.z * vm[6]) + vm[7]
        qw = (pos.x * vm[12]) + (pos.y * vm[13]) + (pos.z * vm[14]) + vm[15]
        if qw < 0.1: return vec2(-1, -1)
        return vec2((w/2)*(1+(qx/qw)), (h/2)*(1-(qy/qw)))
MENU_OPEN = True
CURRENT_TAB = "AIM"
LUA_SCRIPT_TEXT = "--[[ \n     walkspeed changer (luavm testing) \n]]\n\nprint(\"[>] Initializing Speed Mod...\")\n\nlocal Players = game:GetService(\"Players\")\nlocal LocalPlayer = Players.LocalPlayer\n\nif LocalPlayer then\n    print(\"[+] Found LocalPlayer: \" .. LocalPlayer.Name)\n    \n    local Character = LocalPlayer.Character\n    if Character then\n        local Humanoid = Character:FindFirstChild(\"Humanoid\")\n        if Humanoid then\n            local new_speed = 55\n            print(\"[+] Setting WalkSpeed to \" .. new_speed)\n            Humanoid.WalkSpeed = new_speed\n            print(\"[+] Speed updated successfully!\")\n        else\n            print(\"[-] Humanoid not found\")\n        end\n    else\n        print(\"[-] Character not found\")\n    end\nelse\n    print(\"[-] LocalPlayer not found\")\nend\n"
LUA_CONSOLE_OUTPUT = []
LUA_IS_RUNNING = False
LUA_RUNTIME = None

ROBLOX_INPUT_ENABLED = True

def setrobloxinput(v):
    global ROBLOX_INPUT_ENABLED
    ROBLOX_INPUT_ENABLED = bool(v)

def isrbxactive():
    try:
        hwnd = user32.GetForegroundWindow()
        title = ctypes.create_unicode_buffer(512)
        user32.GetWindowTextW(hwnd, title, 512)
        return "Roblox" in title.value
    except: return False

def setclipboard(text):
    pyperclip.copy(str(text))

def keyrelease(vk):
    if ROBLOX_INPUT_ENABLED:
        user32.keybd_event(vk, 0, 0x0002, 0)

def keypress(vk):
    if ROBLOX_INPUT_ENABLED:
        user32.keybd_event(vk, 0, 0, 0)

def iskeypressed(vk):
    return (user32.GetAsyncKeyState(vk) & 0x8000) != 0

def ismouse1pressed(): return iskeypressed(0x01)
def ismouse2pressed(): return iskeypressed(0x02)

def mouse1press():
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0002, 0, 0, 0, 0)

def mouse1release():
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0004, 0, 0, 0, 0)

def mouse1click():
    mouse1press()
    time.sleep(0.01)
    mouse1release()

def mouse2press():
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0008, 0, 0, 0, 0)

def mouse2release():
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0010, 0, 0, 0, 0)

def mouse2click():
    mouse2press()
    time.sleep(0.01)
    mouse2release()

def mousemoveabs(x, y):
    if ROBLOX_INPUT_ENABLED:
        w, h = win32api.GetSystemMetrics(0), win32api.GetSystemMetrics(1)
        ax = int(float(x) * (65535 / w))
        ay = int(float(y) * (65535 / h))
        user32.mouse_event(0x8000 | 0x0001, ax, ay, 0, 0)

def mousemoverel(x, y):
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0001, int(float(x)), int(float(y)), 0, 0)

def mousescroll(delta):
    if ROBLOX_INPUT_ENABLED:
        user32.mouse_event(0x0800, 0, 0, int(float(delta)), 0)
def lua_print(*args):
    global LUA_CONSOLE_OUTPUT
    msg = " ".join(map(str, args))
    LUA_CONSOLE_OUTPUT.append(f"[{time.strftime('%H:%M:%S')}] {msg}")
    if len(LUA_CONSOLE_OUTPUT) > 50:
        LUA_CONSOLE_OUTPUT.pop(0)
def lua_wait(t=0.03):
    """Wrapper for time.sleep to handle optional arguments in Lua"""
    try:
        sleep_time = float(t) if t is not None else 0.03
        time.sleep(sleep_time)
        return sleep_time
    except:
        time.sleep(0.03)
        return 0.03

def lua_add_drawing(entry):
    with LUA_DRAWING_LOCK:
        LUA_DRAWINGS.append(entry)

def lua_remove_drawing(entry):
    with LUA_DRAWING_LOCK:
        if entry in LUA_DRAWINGS:
            LUA_DRAWINGS.remove(entry)

def lua_warn(*args):
    global LUA_CONSOLE_OUTPUT
    msg = " ".join(map(str, args))
    LUA_CONSOLE_OUTPUT.append(f"[{time.strftime('%H:%M:%S')}] [!] WARN: {msg}")
    if len(LUA_CONSOLE_OUTPUT) > 50:
        LUA_CONSOLE_OUTPUT.pop(0)

def lua_error(msg):
    global LUA_CONSOLE_OUTPUT
    LUA_CONSOLE_OUTPUT.append(f"[{time.strftime('%H:%M:%S')}] LUA ERROR: {msg}")
    if len(LUA_CONSOLE_OUTPUT) > 50:
        LUA_CONSOLE_OUTPUT.pop(0)
    raise Exception(msg)

def lua_spawn(func):
    if callable(func):
        threading.Thread(target=func, daemon=True).start()

def run_lua_script_thread(script, mem_obj):
    global LUA_IS_RUNNING, LUA_RUNTIME
    LUA_IS_RUNNING = True
    try:
        lua = LuaRuntime(unpack_returned_tuples=True)
        LUA_RUNTIME = lua
        g = lua.globals()
        g['print'] = lua_print
        g['printl'] = lua_print
        g['warn'] = lua_warn
        g['error'] = lua_error
        g['wait'] = lua_wait
        g['_add_drawing'] = lua_add_drawing
        g['_remove_drawing'] = lua_remove_drawing
        g['spawn'] = lua_spawn
        g['run_secure'] = lambda f: f() # Stub for run_secure
        g['require'] = lambda x: None # Stub for require
        
        # task library
        g['task'] = lua.table(
            spawn = lua_spawn,
            wait = lua_wait,
            defer = lua_spawn # Alias for now
        )

        g['SetFastFlag'] = lambda k, v: lua_print(f"FFlag '{k}' set to {v} (Stub)")
        g['GetFastFlag'] = lambda k: False
        
        # Input Functions
        g['setrobloxinput'] = setrobloxinput
        g['isrbxactive'] = isrbxactive
        g['setclipboard'] = setclipboard
        g['keyrelease'] = keyrelease
        g['keypress'] = keypress
        g['iskeypressed'] = iskeypressed
        g['ismouse1pressed'] = ismouse1pressed
        g['ismouse2pressed'] = ismouse2pressed
        g['mouse1press'] = mouse1press
        g['mouse1release'] = mouse1release
        g['mouse1click'] = mouse1click
        g['mouse2press'] = mouse2press
        g['mouse2release'] = mouse2release
        g['mouse2click'] = mouse2click
        g['mousemoveabs'] = mousemoveabs
        g['mousemoverel'] = mousemoverel
        g['mousescroll'] = mousescroll
        g['read_ptr'] = mem_obj.read_ptr
        g['read_mem'] = mem_obj.read_mem
        g['read_str'] = mem_obj.read_str
        g['write_mem'] = mem_obj.write_mem
        g['write_str'] = mem_obj.write_str
        def read_f(addr):
            r = mem_obj.read_mem(addr, 4)
            return struct.unpack('f', r)[0] if len(r) == 4 else 0.0
        def write_f(addr, v):
            return mem_obj.write_mem(addr, struct.pack('f', float(v)))
        def read_v3(addr):
            r = mem_obj.read_mem(addr, 12)
            if len(r) == 12:
                x, y, z = struct.unpack('fff', r)
                return lua.table(x=x, y=y, z=z)
            return lua.table(x=0, y=0, z=0)
        def write_v3(addr, v):
            data = struct.pack('fff', float(v.x), float(v.y), float(v.z))
            return mem_obj.write_mem(addr, data)
        g['read_float'] = read_f
        g['write_float'] = write_f
        g['read_vec3'] = read_v3
        g['write_vec3'] = write_v3
        def read_i(addr):
             r = mem_obj.read_mem(addr, 8)
             return struct.unpack('q', r)[0] if len(r) == 8 else 0
        g['read_int'] = read_i
        def read_b(addr, mask):
            r = mem_obj.read_mem(addr, 1)
            return (struct.unpack('B', r)[0] & mask) != 0 if r else False
        def write_b(addr, mask, val):
            r = mem_obj.read_mem(addr, 1)
            if r:
                curr = struct.unpack('B', r)[0]
                if val: curr |= mask
                else: curr &= ~mask
                mem_obj.write_mem(addr, struct.pack('B', curr))
        g['read_bit'] = read_b
        g['write_bit'] = write_b
        def http_get(url):
            try: return requests.get(url, timeout=5).text
            except: return ""
        g['_http_get'] = http_get
        g['_find_child'] = mem_obj.find_child_name
        g['_find_class'] = mem_obj.find_class
        g['_get_class'] = mem_obj.get_class_name
        def get_children_as_table(parent):
            children = mem_obj.get_children(parent)
            return lua.table(*children) if children else lua.table()
        g['_get_children'] = get_children_as_table
        g['_get_players_ptr'] = lambda: mem_obj.players
        g['_get_workspace_ptr'] = lambda: mem_obj.workspace
        g['_get_dm_ptr'] = lambda: mem_obj.data_model
        
        def lua_w2s(x, y, z):
            try:
                vm_raw = mem_obj.read_mem(mem_obj.visual_engine + O_VIEW_MATRIX, 64)
                if not vm_raw: return lua.table(X=0, Y=0), False
                vm = struct.unpack('16f', vm_raw)
                w, h = win32api.GetSystemMetrics(0), win32api.GetSystemMetrics(1)
                
                # Math implementation inline to avoid scope issues
                qx = (x * vm[0]) + (y * vm[1]) + (z * vm[2]) + vm[3]
                qy = (x * vm[4]) + (y * vm[5]) + (z * vm[6]) + vm[7]
                qw = (x * vm[12]) + (y * vm[13]) + (z * vm[14]) + vm[15]
                if qw < 0.1: return lua.table(X=-1000, Y=-1000), False
                
                sx = (w/2) * (1 + (qx/qw))
                sy = (h/2) * (1 - (qy/qw))
                return lua.table(X=sx, Y=sy), True
            except: return lua.table(X=0, Y=0), False
        g['_w2s'] = lua_w2s

        off_dict = {}
        for k, v in globals().items():
            if k.startswith("O_"):
                base = k[2:].lower()
                off_dict[base] = v
                off_dict[base.replace("_", "")] = v
            elif k.startswith("M_"):
                off_dict[k.lower()] = v
                off_dict[k.lower().replace("_", "")] = v
        g['Offsets'] = lua.table(**off_dict)
        lua.execute("""
            local instances = {}
            local property_types = {
                health = "float", maxhealth = "float", walkspeed = "float",
                jumppower = "float", hipheight = "float", transparency = "float",
                fov = "float", clocktime = "float", gravity = "float",
                brightness = "float", topambient = "vec3", ambient = "vec3",
                name = "string", displayname = "string", userid = "int",
                text = "string", value = "float", visible = "float",
                position = "vec3", velocity = "vec3", size = "vec3",
                cframe = "vec3", -- Map CFrame to Position (0xE4) for external teleporting
                currentcamera = "ptr", localplayer = "ptr",
                meshid = "string", hit = "vec3", target = "ptr",
                cancollide = "bool", anchored = "bool", cantouch = "bool",
                placeid = "int", gameid = "int", jobid = "string",
                textcolor3 = "vec3", backgroundcolor3 = "vec3",
                textcolor = "vec3", backgroundcolor = "vec3"
            }
            local property_masks = {
                cancollide = Offsets.mcancollide or 0x08,
                anchored = Offsets.manchored or 0x02,
                cantouch = Offsets.mcantouch or 0x10
            }
            local _v3_new = function(x, y, z)
                if type(x) == "table" then return x end
                return {x = x or 0, y = y or 0, z = z or 0}
            end
            Vector3 = { new = _v3_new }
            
            local _cf_new = function(x, y, z)
                if type(x) == "table" and x.x then return x end
                return {x = x or 0, y = y or 0, z = z or 0, Position = {x = x or 0, y = y or 0, z = z or 0}}
            end
            CFrame = { new = _cf_new }

            function wrap(addr)
                if not addr or addr == 0 or addr < 0x1000 then return nil end
                if instances[addr] then return instances[addr] end
                local proxy = { _addr = addr }
                setmetatable(proxy, {
                    __index = function(self, k)
                        if k == "Address" then return addr end
                        local class = _get_class(addr)
                        local low_class = (class or ""):lower()
                        if k == "ClassName" then return class or "Instance" end
                        local low_k = k:lower():gsub("_", "")
                        
                        -- 1. Methods
                        if k == "GetChildren" then
                            return function()
                                local t = {}
                                local children = _get_children(addr)
                                if children then
                                    for _, c in ipairs(children) do
                                        if c and c ~= 0 then
                                            table.insert(t, wrap(c))
                                        end
                                    end
                                end
                                return t
                            end
                        end
                        if k == "FindFirstChild" then
                            return function(_, name)
                                local c = _find_child(addr, name)
                                return wrap(c)
                            end
                        end
                        if k == "WaitForChild" then
                            return function(_, name, timeout)
                                local start = os.time()
                                while true do
                                    local c = _find_child(addr, name)
                                    if c ~= 0 then return wrap(c) end
                                    if timeout and (os.time() - start) > timeout then return nil end
                                    wait(0.1)
                                end
                            end
                        end
                        if k == "HttpGet" and low_class == "httpservice" then
                            return function(_, url) return _http_get(url) end
                        end
                        if k == "GetMouse" and (low_class == "player" or low_class == "players") then
                            return function()
                                local target = addr
                                if low_class == "players" then
                                    local lp_ptr = read_ptr(addr + (Offsets.localplayer or 0x130))
                                    if lp_ptr == 0 then return nil end
                                    target = lp_ptr
                                end
                                return wrap(read_ptr(target + (Offsets.playermouse or 0xCE8)))
                            end
                        end
                        
                        -- Camera W2S
                        if (k == "WorldToViewportPoint" or k == "WorldToScreenPoint") and low_class == "camera" then
                            return function(_, pos)
                                local s_pos, vis = _w2s(pos.x, pos.y, pos.z)
                                return Vector3.new(s_pos.X, s_pos.Y, 0), vis
                            end
                        end
                        
                        -- Service Specific indexing
                        if low_class == "players" and low_k == "localplayer" then
                            return wrap(read_ptr(addr + (Offsets.localplayer or 0x130)))
                        end
                        
                        -- 2. Properties
                        local off = Offsets[low_k]
                        -- Logic Aliases
                        if low_k == "character" then off = Offsets.modelinstance end
                        if low_k == "currentcamera" and low_class == "workspace" then off = Offsets.currentcamera end
                        if low_k == "hit" then off = Offsets.mousehitpos end
                        if low_k == "target" then off = Offsets.inputobject end
                        if low_k == "cframe" then off = Offsets.position end -- Redirect CFrame reading to Position (0xE4)
                        
                        local target_addr = addr
                        -- Redirect Position/Velocity/CFrame for Parts/Models to their Primitive
                        if (low_k == "position" or low_k == "velocity" or low_k == "cframe") and (low_class:find("part") or low_class == "model") then
                            local prim = read_ptr(addr + (Offsets.primitive or 0x148))
                            if prim ~= 0 then target_addr = prim end
                        end
                        
                        if off then
                            local t = property_types[low_k]
                            if t == "string" then
                                local s_ptr = read_ptr(target_addr + off)
                                return read_str(s_ptr)
                            end
                            if t == "float" then return read_float(target_addr + off) end
                            if t == "vec3" then return read_vec3(target_addr + off) end
                            if t == "int" then return read_int(target_addr + off) end
                            if t == "bool" then return read_bit(target_addr + off, property_masks[low_k] or 0) end
                            local ptr = read_ptr(target_addr + off)
                            if ptr > 0xFFFFF then return wrap(ptr) end
                            return ptr
                        end
                        -- 3. Dynamic Child Search
                        local child = _find_child(addr, k) -- Use original 'k' for exact name match
                        if child ~= 0 then return wrap(child) end
                        return nil
                    end,
                    __newindex = function(_, k, v)
                        local low_k = k:lower():gsub("_", "")
                        local off = Offsets[low_k]
                        local target_addr = addr
                        local class = _get_class(addr)
                        local low_class = (class or ""):lower()
                        
                        if (low_k == "position" or low_k == "velocity" or low_k == "cframe") and (low_class:find("part") or low_class == "model") then
                            local prim = read_ptr(addr + (Offsets.primitive or 0x148))
                            if prim ~= 0 then target_addr = prim end
                        end
                        
                        if off then
                            local t = property_types[low_k]
                            if t == "vec3" or (type(v) == "table" and (v.x or v.Position)) then
                                local val = v
                                if v.Position then val = v.Position end -- Extract Position from CFrame stub
                                write_vec3(target_addr + off, val)
                            elseif t == "float" or type(v) == "number" then
                                write_float(target_addr + off, v)
                                -- Stealth Bypass
                                if low_k == "walkspeed" and Offsets.walkspeedcheck then
                                    write_float(target_addr + Offsets.walkspeedcheck, v)
                                end
                                if low_k == "jumppower" and Offsets.jumppowercheck then
                                    write_float(target_addr + Offsets.jumppowercheck, v)
                                end
                            elseif t == "string" or type(v) == "string" then
                                write_str(target_addr + off, v)
                            elseif t == "bool" then
                                write_bit(target_addr + off, property_masks[low_k] or 0, v)
                            end
                        end
                    end,
                    __tostring = function()
                        local cls = _get_class(addr)
                        return (cls or "Instance") .. "(@0x" .. string.format("%X", addr) .. ")"
                    end
                })
                instances[addr] = proxy
                return proxy
            end
            game = {
                GetService = function(self, name)
                    local dm = _get_dm_ptr()
                    if dm == 0 then return nil end
                    local svc = _find_class(dm, name)
                    return wrap(svc)
                end,
                HttpGet = function(self, url) return _http_get(url) end,
                GetMouse = function(self)
                    local p_ptr = _get_players_ptr()
                    if p_ptr == 0 then return nil end
                    local lp = wrap(p_ptr).LocalPlayer
                    if lp then return lp:GetMouse() end
                    return nil
                end
            }
            setmetatable(game, {
                __index = function(self, k)
                    local low_k = k:lower():gsub("_", "")
                    if low_k == "players" then return wrap(_get_players_ptr()) end
                    if low_k == "workspace" then return wrap(_get_workspace_ptr()) end
                    if low_k == "localplayer" then
                        local p = wrap(_get_players_ptr())
                        if p then return p.LocalPlayer end
                        return nil
                    end
                    if low_k == "lighting" then return self:GetService("Lighting") end
                    -- Check for DataModel properties
                    local off = Offsets[low_k]
                    if off then
                        local dm = _get_dm_ptr()
                        local t = property_types[low_k]
                        if t == "int" then return read_ptr(dm + off) end
                        if t == "string" then return read_str(read_ptr(dm + off)) end
                    end
                    return self:GetService(k)
                end
            })

            Vector2 = {}
            Vector2.__index = Vector2
            function Vector2.new(x, y)
                return setmetatable({x = x or 0, y = y or 0, X = x or 0, Y = y or 0}, Vector2)
            end
            function Vector2.__add(a, b) return Vector2.new(a.x + b.x, a.y + b.y) end
            function Vector2.__sub(a, b) return Vector2.new(a.x - b.x, a.y - b.y) end
            function Vector2.__mul(a, b) 
                if type(b) == "number" then return Vector2.new(a.x * b, a.y * b) end
                return Vector2.new(a.x * b.x, a.y * b.y)
            end

            Color3 = {}
            Color3.__index = Color3
            function Color3.new(r, g, b)
                return setmetatable({r = r or 0, g = g or 0, b = b or 0, R = r or 0, G = g or 0, B = b or 0}, Color3)
            end
            function Color3.fromRGB(r, g, b) return Color3.new(r/255, g/255, b/255) end

            Drawing = {}
            function Drawing.new(dtype)
                local obj = {
                    Type = dtype,
                    Visible = false,
                    Color = Color3.new(1, 1, 1),
                    Transparency = 1,
                    Thickness = 1,
                    Position = Vector2.new(0, 0),
                    Size = Vector2.new(0, 0),
                    From = Vector2.new(0, 0),
                    To = Vector2.new(0, 0),
                    PointA = Vector2.new(0, 0),
                    PointB = Vector2.new(0, 0),
                    PointC = Vector2.new(0, 0),
                    Text = "",
                    Center = false,
                    Outline = false,
                    OutlineColor = Color3.new(0, 0, 0),
                    Radius = 10,
                    NumSides = 32,
                    Filled = false,
                    Corner = 0
                }
                
                -- Register in LUA_DRAWINGS
                local entry = {Type = dtype, Visible = false}
                _add_drawing(entry)
                
                local proxy = setmetatable({}, {
                    __index = obj,
                    __newindex = function(_, k, v)
                        obj[k] = v
                        -- Sync to Python
                        if k == "Position" or k == "Size" or k == "From" or k == "To" or k == "PointA" or k == "PointB" or k == "PointC" then
                            entry[k] = {x = v.x, y = v.y}
                        elseif k == "Color" or k == "OutlineColor" then
                            entry[k] = {v.r, v.g, v.b}
                        else
                            entry[k] = v
                        end
                    end
                })
                
                function proxy:Remove()
                    _remove_drawing(entry)
                end
                proxy.Destroy = proxy.Remove
                
                return proxy
            end

            workspace = wrap(_get_workspace_ptr())
            Workspace = workspace
            
            -- Set up global table _G
            _G.game = game
            _G.workspace = workspace
            _G.Workspace = workspace
            
            Vector3 = { new = Vector3 }
            
            -- Custom Executor Functions
            function identifyexecutor()
                print("[Executor] Glycon v2.0")
                return "Glycon", "1.0"
            end
            getexecutorname = identifyexecutor
            
            function notify(title, text, duration)
                print("[NOTIFY] " .. tostring(title) .. ": " .. tostring(text))
            end
            
            function loadstring(code, chunkname)
                local fn, err = load(code, chunkname or "loadstring")
                if not fn then error(err) end
                return fn
            end
            
            function getgenv()
                return _G
            end
            
            function getrenv()
                return _G
            end
            
            function getreg()
                return {}
            end
            
            function getgc(include_tables)
                return {}
            end
            
            function getscripts()
                return {}
            end
            
            function getrunningscripts()
                return {}
            end
            
            function getloadedmodules()
                return {}
            end
            
            function getinstances()
                local t = {}
                for addr, inst in pairs(instances) do
                    table.insert(t, inst)
                end
                return t
            end
            
            function getnilinstances()
                return {}
            end
            
            function fireclickdetector(detector, distance)
                print("[fireclickdetector] Not implemented in external mode")
            end
            
            function firetouchinterest(part1, part2, toggle)
                print("[firetouchinterest] Not implemented in external mode")
            end
            
            function fireproximityprompt(prompt, amount, skip)
                print("[fireproximityprompt] Not implemented in external mode")
            end
            
            function setclipboard(text)
                print("[setclipboard] " .. tostring(text))
            end
            
            function setfpscap(fps)
                print("[setfpscap] Set to " .. tostring(fps))
            end
            
            function isreadonly(t)
                return false
            end
            
            function setreadonly(t, val)
                -- no-op
            end
            
            function checkcaller()
                return true
            end
            
            function islclosure(fn)
                return type(fn) == "function"
            end
            
            function iscclosure(fn)
                return false
            end
            
            function newcclosure(fn)
                return fn
            end
            
            function hookfunction(target, hook)
                return target
            end
            hookfunc = hookfunction
            
            function hookmetamethod(obj, method, hook)
                return function() end
            end
            
            function getrawmetatable(obj)
                return getmetatable(obj) or {}
            end
            
            function setrawmetatable(obj, mt)
                return setmetatable(obj, mt)
            end
            
            function getnamecallmethod()
                return ""
            end
            
            function getscripthash(script)
                return "glycon_external_hash"
            end
            
            function getscriptbytecode(script)
                return ""
            end
            
            function decompile(script)
                return "-- Decompilation not available in external mode"
            end
            
            function base64encode(data)
                local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
                return ((data:gsub('.', function(x)
                    local r, b2 = '', x:byte()
                    for i = 8, 1, -1 do r = r .. (b2 % 2 ^ i - b2 % 2 ^ (i - 1) > 0 and '1' or '0') end
                    return r
                end) .. '0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
                    if #x < 6 then return '' end
                    local c = 0
                    for i = 1, 6 do c = c + (x:sub(i, i) == '1' and 2 ^ (6 - i) or 0) end
                    return b:sub(c + 1, c + 1)
                end) .. ({ '', '==', '=' })[#data % 3 + 1])
            end
            
            function base64decode(data)
                local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
                data = string.gsub(data, '[^' .. b .. '=]', '')
                return (data:gsub('.', function(x)
                    if x == '=' then return '' end
                    local r, f = '', (b:find(x) - 1)
                    for i = 6, 1, -1 do r = r .. (f % 2 ^ i - f % 2 ^ (i - 1) > 0 and '1' or '0') end
                    return r
                end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
                    if #x ~= 8 then return '' end
                    local c = 0
                    for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2 ^ (8 - i) or 0) end
                    return string.char(c)
                end))
            end
            
            function WorldToScreen(pos)
                -- Returns screen position (stub, needs mem integration)
                return Vector3(0, 0, 0), false
            end
            
            function GetPlayers()
                local players_service = game.Players
                if not players_service then return {} end
                local t = {}
                local children = players_service:GetChildren()
                for _, child in ipairs(children) do
                    if child.ClassName == "Player" then
                        table.insert(t, child)
                    end
                end
                return t
            end
            

            
            -- =====================
            drawing_objects = {}
            local drawing_id = 0
            
            local function create_color3(r, g, b)
                return {R = r or 1, G = g or 1, B = b or 1}
            end
            
            Color3 = {
                new = function(r, g, b) return create_color3(r, g, b) end,
                fromRGB = function(r, g, b) return create_color3((r or 255)/255, (g or 255)/255, (b or 255)/255) end,
                fromHSV = function(h, s, v)
                    local r, g, b
                    local i = math.floor(h * 6)
                    local f = h * 6 - i
                    local p = v * (1 - s)
                    local q = v * (1 - f * s)
                    local t = v * (1 - (1 - f) * s)
                    i = i % 6
                    if i == 0 then r, g, b = v, t, p
                    elseif i == 1 then r, g, b = q, v, p
                    elseif i == 2 then r, g, b = p, v, t
                    elseif i == 3 then r, g, b = p, q, v
                    elseif i == 4 then r, g, b = t, p, v
                    elseif i == 5 then r, g, b = v, p, q
                    end
                    return create_color3(r, g, b)
                end
            }
            
            local function create_vector2(x, y)
                return {X = x or 0, Y = y or 0}
            end
            
            Vector2 = {
                new = function(x, y) return create_vector2(x, y) end
            }
            
            local DrawingObject = {}
            DrawingObject.__index = DrawingObject
            
            function DrawingObject:Remove()
                self.Visible = false
                drawing_objects[self._id] = nil
            end
            
            function DrawingObject:Destroy()
                self:Remove()
            end
            
            local function new_drawing_base(type_name)
                drawing_id = drawing_id + 1
                local obj = setmetatable({
                    _id = drawing_id,
                    _type = type_name,
                    Visible = false,
                    ZIndex = 0,
                    Transparency = 1,
                    Color = Color3.new(1, 1, 1)
                }, DrawingObject)
                drawing_objects[drawing_id] = obj
                return obj
            end
            
            Drawing = {
                Fonts = {
                    UI = 0,
                    System = 1,
                    Plex = 2,
                    Monospace = 3
                },
                
                new = function(object_type)
                    local obj = new_drawing_base(object_type)
                    
                    if object_type == "Line" then
                        obj.From = Vector2.new(0, 0)
                        obj.To = Vector2.new(0, 0)
                        obj.Thickness = 1
                    elseif object_type == "Circle" then
                        obj.Position = Vector2.new(0, 0)
                        obj.Radius = 0
                        obj.Filled = false
                        obj.NumSides = 12
                        obj.Thickness = 1
                    elseif object_type == "Square" then
                        obj.Position = Vector2.new(0, 0)
                        obj.Size = Vector2.new(0, 0)
                        obj.Filled = false
                        obj.Thickness = 1
                    elseif object_type == "Triangle" then
                        obj.PointA = Vector2.new(0, 0)
                        obj.PointB = Vector2.new(0, 0)
                        obj.PointC = Vector2.new(0, 0)
                        obj.Filled = false
                        obj.Thickness = 1
                    elseif object_type == "Text" then
                        obj.Text = ""
                        obj.Position = Vector2.new(0, 0)
                        obj.Size = 13
                        obj.Font = Drawing.Fonts.UI
                        obj.Center = false
                        obj.Outline = false
                        obj.OutlineColor = Color3.new(0, 0, 0)
                        obj.TextBounds = Vector2.new(0, 0)
                    elseif object_type == "Quad" then
                        obj.PointA = Vector2.new(0, 0)
                        obj.PointB = Vector2.new(0, 0)
                        obj.PointC = Vector2.new(0, 0)
                        obj.PointD = Vector2.new(0, 0)
                        obj.Filled = false
                        obj.Thickness = 1
                    elseif object_type == "Image" then
                        obj.Data = ""
                        obj.Position = Vector2.new(0, 0)
                        obj.Size = Vector2.new(0, 0)
                        obj.Rounding = 0
                    end
                    
                    return obj
                end
            }

            -- Signal Implementation
            local Signal = {}
            Signal.__index = Signal
            function Signal.new()
                return setmetatable({_callbacks = {}}, Signal)
            end
            function Signal:Connect(fn)
                local connection = {
                    Disconnect = function(self)
                        for i, v in ipairs(this._callbacks) do
                            if v == fn then table.remove(this._callbacks, i) break end
                        end
                    end
                }
                local this = self
                table.insert(self._callbacks, fn)
                return connection
            end
            function Signal:Fire(...)
                for _, fn in ipairs(self._callbacks) do
                    fn(...)
                end
            end
            
            -- RunService Mock
            local RenderSteppedSignal = Signal.new()
            
            local RunService = {
                RenderStepped = RenderSteppedSignal,
                Heartbeat = RenderSteppedSignal,
                Stepped = RenderSteppedSignal,
                IsStudio = function() return false end,
                IsClient = function() return true end
            }
            
            -- Hook GetService to return RunService
            local old_getservice = game.GetService
            game.GetService = function(self, name)
                if name == "RunService" then return RunService end
                if name == "Players" then return wrap(_get_players_ptr()) end
                if name == "Workspace" then return wrap(_get_workspace_ptr()) end
                return old_getservice(self, name)
            end
            
            -- Exposed function for Python to trigger RenderStepped
            function _trigger_render_stepped(dt)
                RenderSteppedSignal:Fire(dt)
            end
            
            -- Enhance Players Service with Signals
            local PlayerAddedSignal = Signal.new()
            local PlayerRemovingSignal = Signal.new()
            
            local original_wrap = wrap
            wrap = function(addr)
                local proxy = original_wrap(addr)
                if proxy and proxy.ClassName == "Players" then
                    local mt = getmetatable(proxy)
                    local orig_index = mt.__index
                    mt.__index = function(self, k)
                        if k == "GetPlayers" then
                            return function() return GetPlayers() end
                        end
                        if k == "PlayerAdded" then return PlayerAddedSignal end
                        if k == "PlayerRemoving" then return PlayerRemovingSignal end
                        return orig_index(self, k)
                    end
                end
                return proxy
            end
            
            -- isrenderobj check
            function isrenderobj(obj)
                return type(obj) == "table" and obj._type ~= nil
            end
            
            -- cleardrawcache
            function cleardrawcache()
                for id, obj in pairs(drawing_objects) do
                    obj:Remove()
                end
                drawing_objects = {}
            end
            
            -- getrenderproperty / setrenderproperty
            function getrenderproperty(obj, prop)
                if type(obj) == "table" then
                    return obj[prop]
                end
                return nil
            end
            
            function setrenderproperty(obj, prop, value)
                if type(obj) == "table" then
                    obj[prop] = value
                end
            end
        """)
        lua.execute(script)
    except Exception as e:
        lua_print(f"LUA ERROR: {e}")
    finally:
        LUA_IS_RUNNING = False
AVATAR_TEXTURE = None
AVATAR_IMAGE_DATA = None
AVATAR_FETCH_STATUS = "IDLE"
PLAYER_THUMBNAIL_CACHE = {}
PLAYER_THUMBNAIL_IMAGE_DATA = {}
MENU_OPACITY = 1.0
TITLE_FONT = None
TITLE_FONT = None
CUSTOM_BG_PATH = ""
CUSTOM_BG_TEXTURE = None
PENDING_BG_IMAGE = None
AIMBOT_ENABLED = True
AIM_TYPE_INDEX = 0
SMOOTHNESS = 5.0
AIM_FOV = 150.0
SHOW_FOV_CIRCLE = False
FOV_THICKNESS = 1.5
FOV_SIDES = 64
AIM_FOV_COLOR = [0.54, 0.17, 0.89, 0.8]
AIM_FOV_FILLED = False
AIM_FOV_FILL_COLOR = [0.54, 0.17, 0.89, 0.15]
AIM_FOV_GRADIENT = False
AIM_FOV_GRAD_COLOR = [0.0, 0.0, 0.0, 0.0]
STICKY_AIM = True
TEAM_CHECK = True
AIM_KNOCK_CHECK = True
AIM_HIT_NOTIF = True
HITSOUND_ENABLED = True
HITSOUND_VOLUME = 50.0 # Placeholder for future logic if needed
AIM_BOTS = False
WAITING_FOR_BOT_SELECTION = False
MANUAL_BOTS = set()
HITSOUND_NAMES = ["blade", "dodgeball", "hammer", "impact", "metal", "touch"]
HITSOUND_TYPE = 5 # Default: touch (index 5)
AIM_DISTANCE_CHECK = False
AIM_MAX_DISTANCE = 500.0
TARGET_PART_INDEX = 1
BODY_PARTS = [
    "Head",
    "HumanoidRootPart",
    "Torso",
    "UpperTorso",
    "LowerTorso",
    "Left Arm",
    "Right Arm",
    "Left Leg",
    "Right Leg",
    "LeftUpperArm",
    "LeftLowerArm",
    "LeftHand",
    "RightUpperArm",
    "RightLowerArm",
    "RightHand",
    "LeftUpperLeg",
    "LeftLowerLeg",
    "LeftFoot",
    "RightUpperLeg",
    "RightLowerLeg",
    "RightFoot",
]
HIT_NOTIF_CACHE = {}
AIM_KEY = 0x02
AIM_MODE = "Hold"
AIM_TOGGLE_STATE = False
WAITING_FOR_AIM_KEY = False
def pre_open_hitsound():
    global SOUND_STATUS
    SOUND_STATUS = {}
    try:
        sounds_dir = get_resource_path("Sounds")
        for name in HITSOUND_NAMES:
            f_path = os.path.join(sounds_dir, f"{name}.mp3")
            if os.path.exists(f_path):
                # Using short path for MCI to avoid space/encoding issues
                ctypes.windll.winmm.mciSendStringW(f"close hit_{name}", None, 0, None)
                res = ctypes.windll.winmm.mciSendStringW(f"open \"{f_path}\" type mpegvideo alias hit_{name}", None, 0, None)
                SOUND_STATUS[name] = (res == 0)
    except Exception as e:
        pass
pre_open_hitsound()
def get_skeleton_pairs(parts):
    pairs = []
    is_r15 = ("UpperTorso" in parts) or ("LowerTorso" in parts) or ("LeftUpperArm" in parts) or ("RightUpperArm" in parts)
    def add(a, b):
        if parts.get(a) and parts.get(b):
            pairs.append((a, b))
    if is_r15:
        add("Head", "UpperTorso")
        add("UpperTorso", "LowerTorso")
        add("LeftUpperArm", "RightUpperArm")
        add("UpperTorso", "LeftUpperArm")
        add("LeftUpperArm", "LeftLowerArm")
        add("LeftLowerArm", "LeftHand")
        add("UpperTorso", "RightUpperArm")
        add("RightUpperArm", "RightLowerArm")
        add("RightLowerArm", "RightHand")
        add("LeftUpperLeg", "RightUpperLeg")
        add("LowerTorso", "LeftUpperLeg")
        add("LeftUpperLeg", "LeftLowerLeg")
        add("LeftLowerLeg", "LeftFoot")
        add("LowerTorso", "RightUpperLeg")
        add("RightUpperLeg", "RightLowerLeg")
        add("RightLowerLeg", "RightFoot")
    else:
        add("Head", "Torso")
        add("Left Arm", "Right Arm")
        add("Left Leg", "Right Leg")
        add("Torso", "HumanoidRootPart")
        add("Torso", "Left Arm")
        add("Torso", "Right Arm")
        add("Torso", "Left Leg")
        add("Torso", "Right Leg")
    return pairs
RESOLVER_ENABLED = True
RESOLVER_THRESHOLD = 150.0
RESOLVER_SAMPLES = 8
RESOLVER_PING = 60.0
TRIGGERBOT_ENABLED = False
trigger_delay = 0.02
TRIGGER_KEY = 0x06
WAITING_FOR_TRIGGER_KEY = False
LAST_SHOT_TIME = 0
PREDICTION_ENABLED = False
PREDICTION_AMOUNT = 0.165
PRED_X_MULT = 1.0
PRED_Y_MULT = 1.0
PRED_Z_MULT = 1.0
AIM_OFFSET_X = 0.0
AIM_OFFSET_Y = 0.0
AIM_OFFSET_Z = 0.0
AIM_SENS_X = 1.0
AIM_SENS_Y = 1.0
JITTER_ENABLED = False
JITTER_AMOUNT = 2.5
ORBIT_ENABLED = False
ORBIT_RADIUS = 10.0
ORBIT_SPEED = 2.0
ORBIT_HEIGHT = 0.1
ORBIT_ANGLE = 0.0
ORBIT_METHOD = 0
MOUSE_ACCUM_X = 0.0
MOUSE_ACCUM_Y = 0.0
LAST_AIM_KEY_STATE = False
SHOW_ESP = False
ESP_COLOR = [1.0, 1.0, 1.0, 1.0]
SKELETON_COLOR = [1.0, 1.0, 1.0, 1.0]
HEAD_DOT_COLOR = [1.0, 1.0, 1.0, 1.0]
TEXT_COLOR = [1.0, 1.0, 1.0, 1.0]
SNAPLINE_COLOR = [0.54, 0.17, 0.89, 0.5]
SHOW_CORNERS = False
SHOW_FILLED_BOX = False
FILLED_BOX_COLOR = [0.35, 0.15, 0.55, 0.35]
SHOW_SKELETON = False
SHOW_VIEW_LINES = False
VIEW_LINE_COLOR = [1.0, 0.0, 0.0, 1.0]
SHOW_HEALTH_TEXT = False
SHOW_OFFSCREEN = False
SHOW_NAMES = False
SHOW_HEALTH = False
HEALTH_BAR_COLOR = [0.0, 1.0, 0.0, 1.0]
HEALTH_BAR_COLOR_BOT = [1.0, 0.0, 0.0, 1.0]
HEALTH_GRADIENT_ENABLED = False
DISTANCE_COLOR = [1.0, 1.0, 1.0, 1.0]
SHOW_RADAR = True
SHOW_TRACERS = False
SHOW_THREAD_TRACER = False
SHOW_DISTANCE = False
SHOW_HEAD_DOT = False
SHOW_SCANNER_ESP = False
TRACER_THICKNESS = 1.0
THREAD_TRACER_THICKNESS = 1.2
SHOW_TRAILS = False
SHOW_GROUND_SHAPE = False
TRAIL_LENGTH = 30
TRAIL_COLOR = [0.54, 0.17, 0.89, 1.0]
RADAR_SIZE = 160
RADAR_RANGE = 250
RADAR_X, RADAR_Y = 50, 50
MARKED_PLAYERS = set()
LOCKED_PLAYER_ADDR = 0
RADAR_DECORATIONS = []
PLAYER_CACHE = []
CACHE_LOCK = threading.Lock()
INSTANCE_NODE_CACHE = {}
LOCAL_PLAYER_INFO = {"pos_prim": 0, "hum": 0, "team": 0, "hrp_node": 0, "part_prims": {}, "part_nodes": {}, "hp": 100, "m_hp": 100, "ptr": 0, "char": 0, "userId": 0, "name": "Local User"}
FFLAG_DESYNC_ADDR = 0
MANUAL_BOTS = set()
WAITING_FOR_BOT_SELECTION = False
def format_key(vk):
    if vk == 0: return "None"
    m = {0x01: "MB1", 0x02: "MB2", 0x04: "MB3", 0x05: "MB4", 0x06: "MB5", 0x12: "ALT", 0x10: "SHIFT", 0x11: "CTRL", 0x20: "SPACE", 0x09: "TAB", 0x0D: "ENTER", 0x1B: "ESC", 0x2E: "DEL", 0x21: "PGUP", 0x22: "PGDN", 0x23: "END", 0x24: "HOME", 0x25: "LEFT", 0x26: "UP", 0x27: "RIGHT", 0x28: "DOWN"}
    if vk in m: return m[vk]
    try:
        sc = win32api.MapVirtualKey(vk, 0)
        name = win32api.GetKeyNameText(sc << 16)
        if name: return name.upper()
    except: pass
    return f"K_{vk:02X}"
def generate_radar_ornaments():
    global RADAR_DECORATIONS
    RADAR_DECORATIONS = []
    for _ in range(12):
        ox = random.uniform(-RADAR_RANGE, RADAR_RANGE)
        oz = random.uniform(-RADAR_RANGE, RADAR_RANGE)
        RADAR_DECORATIONS.append((ox, oz, random.choice(["TREE", "SNOW"])))
TOGGLE_WS = False
TOGGLE_JP = False
TOGGLE_HH = False
TOGGLE_INF_JUMP = False
TOGGLE_NOCLIP = False
TOGGLE_FLY = False
WALKSPEED_VAL = 16.0
JUMPPOWER_VAL = 50.0
HIPHEIGHT_VAL = 2.0
FLY_SPEED = 2.0
WS_KEY = 0
JP_KEY = 0
HH_KEY = 0
INF_JUMP_KEY = 0
FLY_KEY = 0
NOCLIP_KEY = 0
WAITING_FOR_WS_KEY = False
WAITING_FOR_JP_KEY = False
WAITING_FOR_HH_KEY = False
WAITING_FOR_INF_JUMP_KEY = False
WAITING_FOR_FLY_KEY = False
WAITING_FOR_NOCLIP_KEY = False
CLICK_TP_ENABLED = False
SS_DESYNC_ENABLED = False
NO_JUMP_COOLDOWN_ENABLED = False
LAST_JUMP_T = 0.0
SPINBOT_ENABLED = False
SPINBOT_SPEED = 20.0
SPINBOT_ANGLE = 0.0
SPINBOT_KEY = 0
WAITING_FOR_SPINBOT_KEY = False
RAPIDFIRE_ENABLED = False
RAPID_FIRE_BETA_ENABLED = False
RAPID_FIRE_BETA_VAL = 0.05
SILENT_AIM_ENABLED = False
SILENT_AIM_METHOD = 0
SILENT_AIM_PART_MODE = 1
SILENT_AIM_PART_INDEX = 0
SILENT_AIM_PREDICTION = False
SILENT_AIM_PRED_X = 1.0
SILENT_AIM_PRED_Y = 1.0
SILENT_AIM_FOV = 150.0
SHOW_SILENT_TRACER = True
SILENT_AIM_STICKY = False
SILENT_AIM_TEAM_CHECK = False
SILENT_AIM_SPOOF_MOUSE = True
SILENT_AIM_KNOCK_CHECK = True
SILENT_AIM_HIT_NOTIF = True
SILENT_AIM_VISIBLE_ONLY = False
SILENT_AIM_SLOT = 0
SILENT_AIM_TARGET_ADDR = 0
SILENT_AIM_PART_POS = vec2(-1, -1)
SILENT_AIM_GUI_CACHE = []
SILENT_AIM_SMOOTHNESS = 1.0
SILENT_AIM_LAST_SCAN = 0.0
SILENT_AIM_DISTANCE_CHECK = False
SILENT_AIM_MAX_DISTANCE = 500.0
VIEWPORT_SILENT_AIM_ENABLED = False
VIEWPORT_SILENT_FOV = 150.0
VIEWPORT_SILENT_HIT_NOTIF = True
VIEWPORT_SILENT_TARGET_POS = vec2(-1, -1)
VIEWPORT_SILENT_TARGET_ADDR = 0
VIEWPORT_SILENT_PART_MODE = 1  # 0=Selected, 1=Closest Part, 2=Closest Point
VIEWPORT_SILENT_PART_INDEX = 0
VIEWPORT_SILENT_SHOW_FOV = True
VIEWPORT_SILENT_FOV_COLOR = [0.54, 0.17, 0.89, 0.8]
VIEWPORT_SILENT_FOV_FILLED = False
VIEWPORT_SILENT_FOV_FILL_COLOR = [0.54, 0.17, 0.89, 0.15]
VIEWPORT_SILENT_FOV_GRADIENT = False
VIEWPORT_SILENT_FOV_GRAD_COLOR = [0.0, 0.0, 0.0, 0.0]
SHOW_GRADIENT_FILL = False
GRADIENT_FILL_COLOR_TOP = [0.35, 0.15, 0.55, 0.35]
GRADIENT_FILL_COLOR_BOT = [0.0, 0.0, 0.0, 0.5]
GRADIENT_FILL_DIRECTION = 0 # 0=Vertical, 1=Horizontal
TOGGLE_FOV_MOD = False
FOV_VAL = 70.0
TOGGLE_GRAVITY = False
GRAVITY_VAL = 196.2
TOGGLE_TIME = False
TIME_VAL = 12.0
TOGGLE_FOG = False
FOG_START_VAL = 0.0
FOG_END_VAL = 419.0
TOGGLE_FOG_HUE = False
FOG_HUE_COLOR = [0.54, 0.17, 0.89]
TOGGLE_TICK_RATE = False
TICK_RATE_VAL = 60.0
AUTO_PARRY_ENABLED = False
AUTO_PARRY_RANGE = 18.0
AUTO_PARRY_MODE = 0 # 0=F key, 1=Click
BALL_PART_ADDR = 0
BALL_LAST_SCAN = 0.0
HITBOX_EXPANDER_ENABLED = False
HITBOX_SIZE_VAL = 10.0
HITBOX_VISUALIZER_ENABLED = False
HITBOX_VISUALIZER_COLOR = [0.54, 0.17, 0.89, 0.35]
TOGGLE_SKYBOX = False
SKYBOX_INDEX = 0
SKY_ENABLED = False
SKY_BRIGHTNESS = 1.0
SKY_AMBIENT = [0.5, 0.5, 0.5]
SKY_OUTDOOR_AMBIENT = [0.5, 0.5, 0.5]
SKY_ENVIRO_DIFFUSE = 1.0
SKY_ENVIRO_SPECULAR = 1.0
SKY_COLOR_SHIFT_TOP = [1.0, 1.0, 1.0]
SKY_COLOR_SHIFT_BOT = [1.0, 1.0, 1.0]
TOGGLE_KORBLOX = False
KORBLOX_MODE = 0 # 0=Client (Destroy), 1=Server (Void)
TOGGLE_HEADLESS = False
HEADLESS_MODE = 0 # 0=Client (Destroy), 1=Server (Void)
SKY_ATMOS_ENABLED = False
SKY_ATMOS_DENSITY = 0.3
SKY_ATMOS_HAZE = 0.0
SKY_ATMOS_GLARE = 0.0
SKY_ATMOS_DECAY = [1.0, 1.0, 1.0]
SKY_ATMOS_COLOR = [1.0, 1.0, 1.0]
# === ADDICT TAB GLOBALS ===
ADDICT_ANTI_STOMP_ENABLED = False
ADDICT_ANTI_STOMP_THRESHOLD = 5.0  # Health % below which to reset
ADDICT_ANTI_SLOW_ENABLED = False
ADDICT_ANTI_SLOW_SPEED = 16.0  # Default walkspeed to restore
ADDICT_INSTANT_FALL_ENABLED = False
ADDICT_ANIMATION_ENABLED = False
ADDICT_ANIMATION_ID = ""  # Roblox animation ID (Legacy)

# Animation Pack Data
ANIMATION_PACKS = ["Default", "Astronaut", "Bubbly", "Cartoony", "Elder", "Knight", "Levitation", "Mage", "Ninja", "Pirate", "Robot", "Rthro", "Stylish", "Superhero", "Toy", "Vampire", "Werewolf", "Zombie"]
ANIM_TYPE_SELECTIONS = {
    "Idle": 0, "Run": 0, "Walk": 0, "Jump": 0, "Fall": 0, "Climb": 0, "Swim": 0, "Swim (Idle)": 0
}

ANIMATION_HUB = {
    "Astronaut": {
        "Run": ["891636393"], "Walk": ["891636393"], "Jump": ["891627522"], "Idle": ["891621366", "891633237", "1047759695"], 
        "Fall": ["891617961"], "Swim": ["891639666"], "SwimIdle": ["891663592"], "Climb": ["891609353"]
    },
    "Bubbly": {
        "Run": ["910025107"], "Walk": ["910034870"], "Jump": ["910016857"], "Idle": ["910004836", "910009958", "1018536639"], 
        "Fall": ["910001910"], "Swim": ["910028158"], "SwimIdle": ["910030921"], "Climb": ["909997997"]
    },
    "Cartoony": {
        "Run": ["742638842"], "Walk": ["742640026"], "Jump": ["742637942"], "Idle": ["742637544", "742638445", "885477856"], 
        "Fall": ["742637151"], "Swim": ["742639220"], "SwimIdle": ["742639812"], "Climb": ["742636889"]
    },
    "Elder": {
        "Run": ["845386501"], "Walk": ["845403856"], "Jump": ["845398858"], "Idle": ["845397899", "845400520", "901160519"], 
        "Fall": ["845396048"], "Swim": ["845401742"], "SwimIdle": ["845403127"], "Climb": ["845392038"]
    },
    "Knight": {
        "Run": ["657564596"], "Walk": ["657552124"], "Jump": ["658409194"], "Idle": ["657595757", "657568135", "885499184"], 
        "Fall": ["657600338"], "Swim": ["657560551"], "SwimIdle": ["657557095"], "Climb": ["658360781"]
    },
    "Levitation": {
        "Run": ["616010382"], "Walk": ["616013216"], "Jump": ["616008936"], "Idle": ["616006778", "616008087", "886862142"], 
        "Fall": ["616005863"], "Swim": ["616011509"], "SwimIdle": ["616012453"], "Climb": ["616003713"]
    },
    "Mage": {
        "Run": ["707861613"], "Walk": ["707897309"], "Jump": ["707853694"], "Idle": ["707742142", "707855907", "885508740"], 
        "Fall": ["707829716"], "Swim": ["707876443"], "SwimIdle": ["707894699"], "Climb": ["707826056"]
    },
    "Ninja": {
        "Run": ["656118852"], "Walk": ["656121766"], "Jump": ["656117878"], "Idle": ["656117400", "656118341", "886742569"], 
        "Fall": ["656115606"], "Swim": ["656119721"], "SwimIdle": ["656121397"], "Climb": ["656114359"]
    },
    "Pirate": {
        "Run": ["750783738"], "Walk": ["750785693"], "Jump": ["750782230"], "Idle": ["750781874", "750782770", "885515365"], 
        "Fall": ["750780242"], "Swim": ["750784579"], "SwimIdle": ["750785176"], "Climb": ["750779899"]
    },
    "Robot": {
        "Run": ["616091570"], "Walk": ["616095330"], "Jump": ["616090535"], "Idle": ["616088211", "616089559", "885531463"], 
        "Fall": ["616087089"], "Swim": ["616092998"], "SwimIdle": ["616094091"], "Climb": ["616086039"]
    },
    "Rthro": {
        "Run": ["2510198475"], "Walk": ["2510202577"], "Jump": ["2510197830"], "Idle": ["2510197257", "2510196951", "3711062489"], 
        "Fall": ["2510195892"], "Swim": ["2510199791"], "SwimIdle": ["2510201162"], "Climb": ["2510192778"]
    },
    "Stylish": {
        "Run": ["616140816"], "Walk": ["616146177"], "Jump": ["616139451"], "Idle": ["616136790", "616138447", "886888594"], 
        "Fall": ["616134815"], "Swim": ["616143378"], "SwimIdle": ["616144772"], "Climb": ["616133594"]
    },
    "Superhero": {
        "Run": ["616117076"], "Walk": ["616122287"], "Jump": ["616115533"], "Idle": ["616111295", "616113536", "885535855"], 
        "Fall": ["616108001"], "Swim": ["616119360"], "SwimIdle": ["616120861"], "Climb": ["616104706"]
    },
    "Toy": {
        "Run": ["782842708"], "Walk": ["782843345"], "Jump": ["782847020"], "Idle": ["782841498", "782845736", "980952228"], 
        "Fall": ["782846423"], "Swim": ["782844582"], "SwimIdle": ["782845186"], "Climb": ["782843869"]
    },
    "Vampire": {
        "Run": ["1083462077"], "Walk": ["1083473930"], "Jump": ["1083455352"], "Idle": ["1083445855", "1083450166", "1088037547"], 
        "Fall": ["1083443587"], "Swim": ["1083464683"], "SwimIdle": ["1083467779"], "Climb": ["1083439238"]
    },
    "Werewolf": {
        "Run": ["1083216690"], "Walk": ["1083178339"], "Jump": ["1083218792"], "Idle": ["1083195517", "1083214717", "1099492820"], 
        "Fall": ["1083189019"], "Swim": ["1083222527"], "SwimIdle": ["1083225406"], "Climb": ["1083182000"]
    },
    "Zombie": {
        "Run": ["616163682"], "Walk": ["616168032"], "Jump": ["616161997"], "Idle": ["616158929", "616160636", "885545458"], 
        "Fall": ["616157476"], "Swim": ["616165109"], "SwimIdle": ["616166655"], "Climb": ["616156119"]
    }
}

ADDICT_RAGE_ENABLED = False
ADDICT_RAGE_MODE = 0  # 0=Hold, 1=Toggle
ADDICT_RAGE_KEY = 0x06  # MB4 default
ADDICT_RAGE_ORBIT_RADIUS = 8.0
ADDICT_RAGE_ORBIT_SPEED = 14.0
ADDICT_RAGE_ORBIT_HEIGHT = 0.1
ADDICT_RAGE_TOGGLE_STATE = False
ADDICT_RAGE_TARGET_ADDR = 0
ADDICT_RAGE_ORBIT_ANGLE = 0.0
WAITING_FOR_ADDICT_RAGE_KEY = False
# Kill All Feature
KILL_ALL_ENABLED = False
KILL_ALL_TARGET_ADDR = 0
KILL_ALL_ORBIT_ANGLE = 0.0
KILL_ALL_TOOL_EQUIPPED = False
KILL_ALL_HEALTH_THRESHOLD = 1.0  # Switch targets at 1% health
KILL_ALL_ORBIT_RADIUS = 8.0
KILL_ALL_ORBIT_SPEED = 14.0
KILL_ALL_ORBIT_HEIGHT = 0.1
EXPLORER_SELECTED_ADDR = 0
EXPLORER_OPEN_NODES = set()
EXPLORER_CACHE = {}
EXPLORER_LAST_REFRESH = 0
EXPLORER_CLIPBOARD_ADDR = 0
EXPLORER_SEARCH = ""
# Player Interaction & Whitelist
LOOP_GOTO_TARGET_ADDR = 0
FLING_TARGET_ADDR = 0
JUMPSCARE_TARGET_ADDR = 0
STAY_BEHIND_TARGET_ADDR = 0
BANG_TARGET_ADDR = 0
JUMPSCARE_START_TIME = 0.0
JUMPSCARE_ORIG_POS = None
WHITELISTED_PLAYERS = set()
WHITELIST_OPTS = {
    "MouseLock": False,
    "CamLock": False,
    "Full ESP": False,
    "Silent Aim": False,
    "Rivals Silent Aim": False,
    "Kill All": False,
    "Rage Orbit": False
}
SELECTED_PLAYER_INDEX = -1
CONFIG_NAME = "default"
LOAD_LIST_INDEX = 0
AVAILABLE_CONFIGS = []
LAST_APPLIED_SKYBOX = -1
TYPEWRITER_STRINGS = ["Glycon External", "#1 Free Roblox External", "BEST Roblox External", "100% Undetected", "Keyless", "#1 Choice", "Glycon a day keeps paid pastes away", "Copyright @ 2020 Glycon", "Glyconmaxxing"]
TYPEWRITER_INDEX = 0
TYPEWRITER_CHAR_INDEX = 0
TYPEWRITER_TIMER = 0.0
TYPEWRITER_STATE = "typing"
TYPEWRITER_CURRENT_TEXT = ""
TYPEWRITER_SPEED = 0.1
TYPEWRITER_WAIT_TIME = 2.0
TYPEWRITER_DELETE_SPEED = 0.05
ICON_URLS = {
    "WORKSPACE": "https://cdn3.emoji.gg/emojis/733737-files.png",
    "SETTINGS": "https://cdn3.emoji.gg/emojis/1520-blurple-settings.png",
    "LUA": "https://cdn3.emoji.gg/emojis/82361-developer.png",
    "AI": "https://cdn3.emoji.gg/emojis/24054-booster.gif"
}
LOGIN_ANIM_Y = 0.0
LOGIN_ANIM_ALPHA = 0.0
AI_TERMS_ACCEPTED = False
AI_MESSAGES = [{"role": "assistant", "content": "Hello! I am Glycon AI. How can I help you customize your experience today?"}]
AI_INPUT = ""
AI_BUSY = False
hhyperion = "AIzaSyCWVW0ip4Y9lX8X7WFxQiaC9FWpM_lMUDI"
AI_MODEL = "gemma-3-4b-it" 
AI_USER_MODEL = "gemma-3-4b-it" 
ICON_IMAGES = {}
ICON_TEXTURES = {}
def process_ai_commands(text):
    import re
    # Match everything inside [CMD: ... ]
    commands = re.findall(r"\[CMD:([^\]]+)\]", text)
    for cmd_body in commands:
        try:
            # Split by colon. If the AI adds categories like [CMD:ESP:SHOW_ESP:True],
            # parts will be ['ESP', 'SHOW_ESP', 'True']. We take the last two.
            parts = [p.strip() for p in cmd_body.split(":")]
            if len(parts) < 2: continue
            
            var = parts[-2]
            val_clean = parts[-1]
            
            if val_clean.lower() == "true": real_val = True
            elif val_clean.lower() == "false": real_val = False
            elif "," in val_clean:
                # Handle colors/lists [CMD:ESP_COLOR:1,0,0,1]
                real_val = [float(x.strip()) for x in val_clean.split(",")]
            else:
                try: real_val = float(val_clean)
                except: real_val = val_clean
            
            if var in globals():
                globals()[var] = real_val
                # Auto-toggle relevant state if value is set
                if var == "WALKSPEED_VAL": globals()["TOGGLE_WS"] = True
                if var == "JUMPPOWER_VAL": globals()["TOGGLE_JP"] = True
                if var == "HIPHEIGHT_VAL": globals()["TOGGLE_HH"] = True
                if var == "FOV_VAL": globals()["TOGGLE_FOV_MOD"] = True
                if var == "GRAVITY_VAL": globals()["TOGGLE_GRAVITY"] = True
                if var == "TIME_VAL": globals()["TOGGLE_TIME"] = True
        except: pass

def send_ai_chat():
    global AI_INPUT, AI_MESSAGES, AI_BUSY, hhyperion, AI_USER_MODEL
    if not AI_INPUT.strip() or AI_BUSY: return
    user_msg = AI_INPUT
    AI_MESSAGES.append({"role": "user", "content": user_msg})
    AI_INPUT = ""
    AI_BUSY = True
    
    def thread_func():
        global AI_BUSY
        try:
            # Strictly using gemma-3-4b as requested by user
            # We explicitly specify v1beta as Gemma 3 often resides there in the new SDK
            client = genai.Client(api_key=hhyperion, http_options={'api_version': 'v1beta'})
            
            sys_prompt = f"""[SYSTEM: YOU ARE GLYCON AI. You are a chill, fun assistant that controls this cheat.
CORE RULES:
1. MANDATORY: For EVERY user request to change a setting, you MUST include the command tag: [CMD:VARIABLE_NAME:VALUE].
2. PERSONALITY: Be very chill, friendly, and use emojis! Use 'bro', 'dude', or 'man'. Be expressive! 🚀✨
3. FORMAT: The [CMD:...] tag MUST be hidden from your casual talk. Use it as a side-effect.
4. EXAMPLE: If a user says "bro turn off aimbot", you reply: "I got you dude! ❌ Aimbot is now off. [CMD:AIMBOT_ENABLED:False]"
5. ESP: Use 'ESP_COLOR' for "Full Box" and 'FILLED_BOX_COLOR' for "Filled Box".

AVAILABLE VARIABLES:
- AIMBOT: AIMBOT_ENABLED (bool), AIM_TYPE_INDEX (0:Mouse, 1:Memory), SMOOTHNESS (float), AIM_FOV (float), SHOW_FOV_CIRCLE (bool), STICKY_AIM (bool), TEAM_CHECK (bool), AIM_KNOCK_CHECK (bool), AIM_HIT_NOTIF (bool), AIM_MAX_DISTANCE (float), TARGET_PART_INDEX (0-20), PREDICTION_ENABLED (bool), PREDICTION_AMOUNT (float).
- ESP: SHOW_ESP (bool), ESP_COLOR (list 4f), SHOW_NAMES (bool), SHOW_HEALTH (bool), SHOW_RADAR (bool), SHOW_TRACERS (bool), SHOW_DISTANCE (bool), SHOW_SKELETON (bool), SKELETON_COLOR (list 4f), SHOW_FILLED_BOX (bool), FILLED_BOX_COLOR (list 4f), SHOW_HEAD_DOT (bool), SHOW_OFFSCREEN (bool).
- MOVEMENT: WALKSPEED_VAL (float), JUMPPOWER_VAL (float), HIPHEIGHT_VAL (float), TOGGLE_INF_JUMP (bool), TOGGLE_NOCLIP (bool), TOGGLE_FLY (bool), FLY_SPEED (float).
- EXTRAS: RAPIDFIRE_ENABLED (bool), SPINBOT_ENABLED (bool), SPINBOT_SPEED (float), SILENT_AIM_ENABLED (bool), SILENT_AIM_FOV (float), CLICK_TP_ENABLED (bool), SS_DESYNC_ENABLED (bool), NO_JUMP_COOLDOWN_ENABLED (bool).
- WORLD: FOV_VAL (float), GRAVITY_VAL (float), TIME_VAL (float), TOGGLE_FOG (bool), SKYBOX_INDEX (0-5).

Current State: Aimbot={AIMBOT_ENABLED}, ESP={SHOW_ESP}, Speed={WALKSPEED_VAL}, Jump={JUMPPOWER_VAL}, Fly={TOGGLE_FLY}.]
"""
            
            contents = []
            # Gemini/Gemma models require alternating roles starting with user
            eligible_messages = AI_MESSAGES[-11:] 
            
            start_idx = 0
            while start_idx < len(eligible_messages) and eligible_messages[start_idx]["role"] != "user":
                start_idx += 1
            
            first_msg = True
            for m in eligible_messages[start_idx:]:
                text_content = m["content"]
                if first_msg:
                    text_content = sys_prompt + "\n\n" + text_content
                    first_msg = False
                    
                contents.append({
                    "role": "user" if m["role"] == "user" else "model",
                    "parts": [{"text": text_content}]
                })

            if not contents:
                contents = [{"role": "user", "parts": [{"text": sys_prompt + "\n\n" + user_msg}]}]
            
            response = client.models.generate_content(
                model="gemma-3-4b-it",
                contents=contents,
                config={
                    "temperature": 0.8,
                }
            )
            
            if response and response.text:
                ai_text = response.text
                process_ai_commands(ai_text)
                AI_MESSAGES.append({"role": "assistant", "content": ai_text})
            else:
                AI_MESSAGES.append({"role": "assistant", "content": "Error: Empty response from AI (gemma-3-4b)."})
                
        except Exception as e:
            AI_MESSAGES.append({"role": "assistant", "content": f"Connection Error: {str(e)}"})
        finally:
            AI_BUSY = False
            
    threading.Thread(target=thread_func, daemon=True).start()

def fetch_top_icons():
    global ICON_IMAGES
    for name, url in ICON_URLS.items():
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                img = Image.open(io.BytesIO(r.content)).convert("RGBA")
                ICON_IMAGES[name] = img
        except: pass
def load_workspace_icons():
    """Load all PNG icons from the Workspace folder into memory for texture generation"""
    global EXPLORER_ICON_DATA, EXPLORER_ICONS_PATH
    if not os.path.exists(EXPLORER_ICONS_PATH): 
        with open("workspace_icon_debug.txt", "w") as f: f.write(f"Path not found: {EXPLORER_ICONS_PATH}")
        return
    
    count = 0
    for f in os.listdir(EXPLORER_ICONS_PATH):
        if f.endswith(".png"):
            try:
                # Store normalized keys: lowercase, no spaces
                cls_key = f.replace(".png", "").replace(" ", "").lower()
                img_path = os.path.join(EXPLORER_ICONS_PATH, f)
                img = Image.open(img_path).convert("RGBA")
                EXPLORER_ICON_DATA[cls_key] = (img.width, img.height, img.tobytes())
                count += 1
            except: pass
    with open("workspace_icon_debug.txt", "w") as f: f.write(f"Loaded {count} icons from {EXPLORER_ICONS_PATH}")

def get_cfg_dir():
    d = os.path.join(os.getcwd(), "configs")
    if not os.path.exists(d):
        try: os.makedirs(d, exist_ok=True)
        except: d = "."
    return d
def get_configs():
    d = get_cfg_dir()
    return [f.replace(".glycon", "") for f in os.listdir(d) if f.endswith(".glycon")]
def get_autoload():
    try:
        path = os.path.join(get_cfg_dir(), "autoload.dat")
        if os.path.exists(path):
            with open(path, "r") as f: return f.read().strip()
    except: pass
    return ""
def set_autoload(name):
    try:
        path = os.path.join(get_cfg_dir(), "autoload.dat")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f: f.write(name)
        return True
    except Exception as e:
        return False
def save_config(name):
    config = {
        "aim": {
            "enabled": AIMBOT_ENABLED,
            "type": AIM_TYPE_INDEX,
            "smoothness": SMOOTHNESS,
            "fov": AIM_FOV,
            "dist_check": AIM_DISTANCE_CHECK,
            "max_dist": AIM_MAX_DISTANCE,
            "show_circle": SHOW_FOV_CIRCLE,
            "thickness": FOV_THICKNESS,
            "sides": FOV_SIDES,
            "sticky": STICKY_AIM,
            "team_check": TEAM_CHECK,
            "target_part": TARGET_PART_INDEX,
            "prediction_enabled": PREDICTION_ENABLED,
            "prediction_amount": PREDICTION_AMOUNT,
            "jitter_enabled": JITTER_ENABLED,
            "jitter_amount": JITTER_AMOUNT,
            "off_x": AIM_OFFSET_X, "off_y": AIM_OFFSET_Y, "off_z": AIM_OFFSET_Z,
            "px": PRED_X_MULT, "py": PRED_Y_MULT, "pz": PRED_Z_MULT,
            "sx": AIM_SENS_X, "sy": AIM_SENS_Y,
            "trigger_enabled": TRIGGERBOT_ENABLED, "trigger_delay": trigger_delay, "trigger_key": TRIGGER_KEY,
            "aim_key": AIM_KEY, "aim_mode": AIM_MODE,
            "res_enabled": RESOLVER_ENABLED, "res_th": RESOLVER_THRESHOLD, "res_samp": RESOLVER_SAMPLES, "res_ping": RESOLVER_PING,
            "hitsounds": HITSOUND_ENABLED, "hitsound_type": HITSOUND_TYPE,
            "aim_bots": AIM_BOTS
        },
        "visuals": {
            "esp": SHOW_ESP, "esp_color": ESP_COLOR, "corners": SHOW_CORNERS, 
            "filled": SHOW_FILLED_BOX, "filled_color": FILLED_BOX_COLOR,
            "skeleton": SHOW_SKELETON, "skeleton_color": SKELETON_COLOR, 
            "viewlines": SHOW_VIEW_LINES, "view_line_color": VIEW_LINE_COLOR,
            "hp_text": SHOW_HEALTH_TEXT, "offscreen": SHOW_OFFSCREEN, 
            "names": SHOW_NAMES, "text_color": TEXT_COLOR, 
            "health": SHOW_HEALTH, "radar": SHOW_RADAR, "radar_size": RADAR_SIZE, "radar_range": RADAR_RANGE, 
            "tracers": SHOW_TRACERS, "tracer_th": TRACER_THICKNESS, "tracer_color": SNAPLINE_COLOR,
            "thread_tracers": SHOW_THREAD_TRACER, "thread_tracer_th": THREAD_TRACER_THICKNESS, 
            "distance": SHOW_DISTANCE, "head_dot": SHOW_HEAD_DOT, "head_dot_color": HEAD_DOT_COLOR,
            "scanner": SHOW_SCANNER_ESP, "ground_shape": SHOW_GROUND_SHAPE, "trails": SHOW_TRAILS, 
            "trail_len": TRAIL_LENGTH, "trail_col": TRAIL_COLOR,
            "hp_color": HEALTH_BAR_COLOR, "hp_grad_color": HEALTH_BAR_COLOR_BOT, "hp_grad_enabled": HEALTH_GRADIENT_ENABLED, "dist_color": DISTANCE_COLOR
        },
        "character": {"ws": WALKSPEED_VAL, "jp": JUMPPOWER_VAL, "hh": HIPHEIGHT_VAL, "inf_jump": TOGGLE_INF_JUMP, "noclip": TOGGLE_NOCLIP, "fly": TOGGLE_FLY, "fly_speed": FLY_SPEED, "ws_key": WS_KEY, "jp_key": JP_KEY, "hh_key": HH_KEY, "inf_jump_key": INF_JUMP_KEY, "fly_key": FLY_KEY, "noclip_key": NOCLIP_KEY},
        "orbit": {"enabled": ORBIT_ENABLED, "radius": ORBIT_RADIUS, "speed": ORBIT_SPEED, "height": ORBIT_HEIGHT},
        "extras": {"click_tp": CLICK_TP_ENABLED, "ss_desync": SS_DESYNC_ENABLED, "no_jump_cd": NO_JUMP_COOLDOWN_ENABLED, "rapidfire": RAPIDFIRE_ENABLED, "rapid_fire_beta": RAPID_FIRE_BETA_ENABLED, "rapid_fire_beta_val": RAPID_FIRE_BETA_VAL, "silent_aim": SILENT_AIM_ENABLED, "silent_method": SILENT_AIM_METHOD, "silent_part_mode": SILENT_AIM_PART_MODE, "silent_part_index": SILENT_AIM_PART_INDEX, "silent_pred": SILENT_AIM_PREDICTION, "silent_pred_x": SILENT_AIM_PRED_X, "silent_pred_y": SILENT_AIM_PRED_Y, "silent_fov": SILENT_AIM_FOV, "silent_show_fov": SHOW_SILENT_TRACER, "silent_sticky": SILENT_AIM_STICKY, "silent_team": SILENT_AIM_TEAM_CHECK, "silent_spoof": SILENT_AIM_SPOOF_MOUSE, "silent_smooth": SILENT_AIM_SMOOTHNESS, "silent_dist_check": SILENT_AIM_DISTANCE_CHECK, "silent_max_dist": SILENT_AIM_MAX_DISTANCE, "silent_knock_check": SILENT_AIM_KNOCK_CHECK, "aim_knock_check": AIM_KNOCK_CHECK, "aim_hit_notif": AIM_HIT_NOTIF, "silent_hit_notif": SILENT_AIM_HIT_NOTIF, "tick_rate_enabled": TOGGLE_TICK_RATE, "tick_rate": TICK_RATE_VAL, "korblox": TOGGLE_KORBLOX, "korblox_mode": KORBLOX_MODE, "headless": TOGGLE_HEADLESS, "headless_mode": HEADLESS_MODE},
        "spinbot": {"enabled": SPINBOT_ENABLED, "speed": SPINBOT_SPEED, "key": SPINBOT_KEY},
        "misc": {"fov": FOV_VAL, "fov_enabled": TOGGLE_FOV_MOD, "gravity": GRAVITY_VAL, "gravity_enabled": TOGGLE_GRAVITY, "time": TIME_VAL, "time_enabled": TOGGLE_TIME, "fog_enabled": TOGGLE_FOG, "fog_start": FOG_START_VAL, "fog_end": FOG_END_VAL, "fog_hue": TOGGLE_FOG_HUE, "fog_color": FOG_HUE_COLOR, "skybox": TOGGLE_SKYBOX, "skybox_idx": SKYBOX_INDEX},
        "menu": {"opacity": MENU_OPACITY, "bg_path": CUSTOM_BG_PATH, "stream_proof": STREAM_PROOF_ENABLED},
        "addict": {
            "anti_stomp": ADDICT_ANTI_STOMP_ENABLED,
            "stomp_threshold": ADDICT_ANTI_STOMP_THRESHOLD,
            "anti_slow": ADDICT_ANTI_SLOW_ENABLED,
            "slow_speed": ADDICT_ANTI_SLOW_SPEED,
            "instant_fall": ADDICT_INSTANT_FALL_ENABLED,
            "anim_enabled": ADDICT_ANIMATION_ENABLED,
            "anim_id": ADDICT_ANIMATION_ID,
            "rage_enabled": ADDICT_RAGE_ENABLED,
            "rage_mode": ADDICT_RAGE_MODE,
            "rage_key": ADDICT_RAGE_KEY,
            "rage_radius": ADDICT_RAGE_ORBIT_RADIUS,
            "rage_speed": ADDICT_RAGE_ORBIT_SPEED,
            "rage_height": ADDICT_RAGE_ORBIT_HEIGHT,
            "anim_selections": ANIM_TYPE_SELECTIONS
        }
    }
    path = os.path.join(get_cfg_dir(), f"{name}.glycon")
    with open(path, "w") as f:
        json.dump(config, f, indent=4)
def load_config(name):
    global AIMBOT_ENABLED, AIM_TYPE_INDEX, SMOOTHNESS, AIM_FOV, SHOW_FOV_CIRCLE, FOV_THICKNESS, FOV_SIDES, STICKY_AIM, TEAM_CHECK, TARGET_PART_INDEX, SHOW_ESP, ESP_COLOR, SHOW_CORNERS, SHOW_FILLED_BOX, SHOW_SKELETON, SHOW_VIEW_LINES, SHOW_HEALTH_TEXT, SHOW_OFFSCREEN, SHOW_NAMES, SHOW_HEALTH, SHOW_RADAR, RADAR_SIZE, RADAR_RANGE, WALKSPEED_VAL, JUMPPOWER_VAL, HIPHEIGHT_VAL, PREDICTION_ENABLED, PREDICTION_AMOUNT, JITTER_ENABLED, JITTER_AMOUNT, SHOW_TRACERS, TRACER_THICKNESS, SHOW_THREAD_TRACER, THREAD_TRACER_THICKNESS, SHOW_DISTANCE, SHOW_HEAD_DOT, ORBIT_ENABLED, ORBIT_RADIUS, ORBIT_SPEED, ORBIT_HEIGHT, AIM_OFFSET_X, AIM_OFFSET_Y, AIM_OFFSET_Z, PRED_X_MULT, PRED_Y_MULT, PRED_Z_MULT, AIM_SENS_X, AIM_SENS_Y, TOGGLE_INF_JUMP, TOGGLE_NOCLIP, TOGGLE_FLY, FLY_SPEED, FOV_VAL, TOGGLE_FOV_MOD, GRAVITY_VAL, TOGGLE_GRAVITY, TIME_VAL, TOGGLE_TIME, TOGGLE_FOG, FOG_START_VAL, FOG_END_VAL, TRIGGERBOT_ENABLED, trigger_delay, TRIGGER_KEY, TOGGLE_FOG_HUE, FOG_HUE_COLOR, AIM_KEY, AIM_MODE, WS_KEY, JP_KEY, INF_JUMP_KEY, FLY_KEY, SHOW_SCANNER_ESP, CLICK_TP_ENABLED, RESOLVER_ENABLED, RESOLVER_THRESHOLD, RESOLVER_SAMPLES, RESOLVER_PING, SS_DESYNC_ENABLED, SHOW_TRAILS, TRAIL_LENGTH, TRAIL_COLOR, SPINBOT_ENABLED, SPINBOT_SPEED, SPINBOT_KEY, SHOW_GROUND_SHAPE, SILENT_AIM_ENABLED, SILENT_AIM_METHOD, SILENT_AIM_PART_MODE, SILENT_AIM_PART_INDEX, SILENT_AIM_PREDICTION, SILENT_AIM_PRED_X, SILENT_AIM_PRED_Y, SILENT_AIM_FOV, SHOW_SILENT_TRACER, SILENT_AIM_STICKY, SILENT_AIM_TEAM_CHECK, SILENT_AIM_SPOOF_MOUSE, NO_JUMP_COOLDOWN_ENABLED, SILENT_AIM_KNOCK_CHECK, SILENT_AIM_VISIBLE_ONLY, RAPIDFIRE_ENABLED, RAPID_FIRE_BETA_ENABLED, RAPID_FIRE_BETA_VAL, TOGGLE_SKYBOX, SKYBOX_INDEX, SILENT_AIM_SMOOTHNESS, AIM_MAX_DISTANCE, AIM_DISTANCE_CHECK, AIM_KNOCK_CHECK, SILENT_AIM_DISTANCE_CHECK, SILENT_AIM_MAX_DISTANCE, AIM_HIT_NOTIF, SILENT_AIM_HIT_NOTIF, MENU_OPACITY, CUSTOM_BG_PATH, STREAM_PROOF_ENABLED, HEALTH_BAR_COLOR, HEALTH_BAR_COLOR_BOT, HEALTH_GRADIENT_ENABLED, DISTANCE_COLOR, HITSOUND_ENABLED, HITSOUND_TYPE
    global ADDICT_ANTI_STOMP_ENABLED, ADDICT_ANTI_STOMP_THRESHOLD, ADDICT_ANTI_SLOW_ENABLED, ADDICT_ANTI_SLOW_SPEED
    global ADDICT_INSTANT_FALL_ENABLED, ADDICT_ANIMATION_ENABLED, ADDICT_ANIMATION_ID
    global ADDICT_RAGE_ENABLED, ADDICT_RAGE_MODE, ADDICT_RAGE_KEY, ADDICT_RAGE_ORBIT_RADIUS
    global ADDICT_RAGE_ORBIT_SPEED, ADDICT_RAGE_ORBIT_HEIGHT
    path = os.path.join(get_cfg_dir(), f"{name}.glycon")
    if not os.path.exists(path): return
    with open(path, "r") as f:
        data = json.load(f)
        a = data.get("aim", {})
        AIMBOT_ENABLED = a.get("enabled", AIMBOT_ENABLED)
        AIM_TYPE_INDEX = a.get("type", 0)
        SMOOTHNESS = a.get("smoothness", SMOOTHNESS)
        AIM_FOV = a.get("fov", AIM_FOV)
        AIM_DISTANCE_CHECK = a.get("dist_check", False)
        AIM_MAX_DISTANCE = a.get("max_dist", 500.0)
        SHOW_FOV_CIRCLE = a.get("show_circle", SHOW_FOV_CIRCLE)
        FOV_THICKNESS = a.get("thickness", FOV_THICKNESS)
        FOV_SIDES = a.get("sides", FOV_SIDES)
        STICKY_AIM = a.get("sticky", STICKY_AIM)
        TEAM_CHECK = a.get("team_check", TEAM_CHECK)
        TARGET_PART_INDEX = a.get("target_part", TARGET_PART_INDEX)
        PREDICTION_ENABLED = a.get("prediction_enabled", PREDICTION_ENABLED)
        PREDICTION_AMOUNT = a.get("prediction_amount", PREDICTION_AMOUNT)
        JITTER_ENABLED = a.get("jitter_enabled", JITTER_ENABLED)
        JITTER_AMOUNT = a.get("jitter_amount", JITTER_AMOUNT)
        AIM_OFFSET_X = a.get("off_x", 0.0)
        AIM_OFFSET_Y = a.get("off_y", 0.0)
        AIM_OFFSET_Z = a.get("off_z", 0.0)
        PRED_X_MULT = a.get("px", 1.0)
        PRED_Y_MULT = a.get("py", 1.0)
        PRED_Z_MULT = a.get("pz", 1.0)
        AIM_SENS_X = a.get("sx", 1.0)
        AIM_SENS_Y = a.get("sy", 1.0)
        TRIGGERBOT_ENABLED = a.get("trigger_enabled", False)
        trigger_delay = a.get("trigger_delay", 0.02)
        TRIGGER_KEY = a.get("trigger_key", 0x06)
        AIM_KEY = a.get("aim_key", 0x02)
        AIM_MODE = a.get("aim_mode", "Hold")
        RESOLVER_ENABLED = a.get("res_enabled", False)
        RESOLVER_THRESHOLD = a.get("res_th", 150.0)
        RESOLVER_SAMPLES = a.get("res_samp", 8)
        RESOLVER_PING = a.get("res_ping", 60.0)
        HITSOUND_ENABLED = a.get("hitsounds", True)
        HITSOUND_TYPE = a.get("hitsound_type", 3)
        AIM_BOTS = a.get("aim_bots", False)
        v = data.get("visuals", {})
        SHOW_ESP, SHOW_NAMES, SHOW_HEALTH, SHOW_RADAR = v.get("esp", SHOW_ESP), v.get("names", SHOW_NAMES), v.get("health", SHOW_HEALTH), v.get("radar", SHOW_RADAR)
        temp_esp_color = v.get("esp_color", [1.0, 1.0, 1.0, 1.0])
        try:
            if len(temp_esp_color) == 4: ESP_COLOR = [float(x) for x in temp_esp_color]
        except: ESP_COLOR = [1.0, 1.0, 1.0, 1.0]
        
        try: SKELETON_COLOR = v.get("skeleton_color", [1.0, 1.0, 1.0, 1.0])
        except: SKELETON_COLOR = [1.0, 1.0, 1.0, 1.0]
        
        try: HEAD_DOT_COLOR = v.get("head_dot_color", [1.0, 1.0, 1.0, 1.0])
        except: HEAD_DOT_COLOR = [1.0, 1.0, 1.0, 1.0]
        
        try: TEXT_COLOR = v.get("text_color", [1.0, 1.0, 1.0, 1.0])
        except: TEXT_COLOR = [1.0, 1.0, 1.0, 1.0]
        
        try: SNAPLINE_COLOR = v.get("tracer_color", [0.54, 0.17, 0.89, 0.5])
        except: SNAPLINE_COLOR = [0.54, 0.17, 0.89, 0.5]

        try: FILLED_BOX_COLOR = v.get("filled_color", [0.35, 0.15, 0.55, 0.35])
        except: FILLED_BOX_COLOR = [0.35, 0.15, 0.55, 0.35]

        try: VIEW_LINE_COLOR = v.get("view_line_color", [1.0, 0.0, 0.0, 1.0])
        except: VIEW_LINE_COLOR = [1.0, 0.0, 0.0, 1.0]

        SHOW_CORNERS, SHOW_FILLED_BOX, SHOW_SKELETON = v.get("corners", SHOW_CORNERS), v.get("filled", SHOW_FILLED_BOX), v.get("skeleton", SHOW_SKELETON)
        SHOW_VIEW_LINES, SHOW_HEALTH_TEXT, SHOW_OFFSCREEN = v.get("viewlines", SHOW_VIEW_LINES), v.get("hp_text", SHOW_HEALTH_TEXT), v.get("offscreen", SHOW_OFFSCREEN)
        RADAR_SIZE, RADAR_RANGE = v.get("radar_size", RADAR_SIZE), v.get("radar_range", RADAR_RANGE)
        SHOW_TRACERS, SHOW_DISTANCE, SHOW_HEAD_DOT = v.get("tracers", SHOW_TRACERS), v.get("distance", SHOW_DISTANCE), v.get("head_dot", SHOW_HEAD_DOT)
        TRACER_THICKNESS = v.get("tracer_th", 1.0)
        SHOW_THREAD_TRACER = v.get("thread_tracers", False)
        THREAD_TRACER_THICKNESS = v.get("thread_tracer_th", 1.2)
        SHOW_SCANNER_ESP = v.get("scanner", False)
        SHOW_TRAILS = v.get("trails", False)
        SHOW_GROUND_SHAPE = v.get("ground_shape", False)
        TRAIL_LENGTH = v.get("trail_len", 30)
        TRAIL_COLOR = v.get("trail_col", [0.54, 0.17, 0.89, 1.0])
        HEALTH_BAR_COLOR = v.get("hp_color", [0.0, 1.0, 0.0, 1.0])
        HEALTH_BAR_COLOR_BOT = v.get("hp_grad_color", [1.0, 0.0, 0.0, 1.0])
        HEALTH_GRADIENT_ENABLED = v.get("hp_grad_enabled", False)
        DISTANCE_COLOR = v.get("dist_color", [1.0, 1.0, 1.0, 1.0])
        c = data.get("character", {})
        WALKSPEED_VAL, JUMPPOWER_VAL, HIPHEIGHT_VAL, TOGGLE_INF_JUMP, TOGGLE_NOCLIP, TOGGLE_FLY, FLY_SPEED = c.get("ws", WALKSPEED_VAL), c.get("jp", JUMPPOWER_VAL), c.get("hh", HIPHEIGHT_VAL), c.get("inf_jump", TOGGLE_INF_JUMP), c.get("noclip", False), c.get("fly", False), c.get("fly_speed", 2.0)
        WS_KEY, JP_KEY, HH_KEY, INF_JUMP_KEY, FLY_KEY, NOCLIP_KEY = c.get("ws_key", 0), c.get("jp_key", 0), c.get("hh_key", 0), c.get("inf_jump_key", 0), c.get("fly_key", 0), c.get("noclip_key", 0)
        o = data.get("orbit", {})
        ORBIT_ENABLED = o.get("enabled", ORBIT_ENABLED)
        ORBIT_RADIUS = o.get("radius", ORBIT_RADIUS)
        ORBIT_SPEED = o.get("speed", ORBIT_SPEED)
        ORBIT_HEIGHT = o.get("height", ORBIT_HEIGHT)
        e = data.get("extras", {})
        CLICK_TP_ENABLED = e.get("click_tp", CLICK_TP_ENABLED)
        SS_DESYNC_ENABLED = e.get("ss_desync", SS_DESYNC_ENABLED)
        NO_JUMP_COOLDOWN_ENABLED = e.get("no_jump_cd", NO_JUMP_COOLDOWN_ENABLED)
        RAPIDFIRE_ENABLED = e.get("rapidfire", False)
        RAPID_FIRE_BETA_ENABLED = e.get("rapid_fire_beta", False)
        RAPID_FIRE_BETA_VAL = e.get("rapid_fire_beta_val", 0.05)
        SILENT_AIM_ENABLED = e.get("silent_aim", SILENT_AIM_ENABLED)
        SILENT_AIM_METHOD = e.get("silent_method", SILENT_AIM_METHOD)
        SILENT_AIM_PART_MODE = e.get("silent_part_mode", SILENT_AIM_PART_MODE)
        SILENT_AIM_PART_INDEX = e.get("silent_part_index", SILENT_AIM_PART_INDEX)
        SILENT_AIM_PREDICTION = e.get("silent_pred", SILENT_AIM_PREDICTION)
        SILENT_AIM_PRED_X = e.get("silent_pred_x", SILENT_AIM_PRED_X)
        SILENT_AIM_PRED_Y = e.get("silent_pred_y", SILENT_AIM_PRED_Y)
        SILENT_AIM_FOV = e.get("silent_fov", SILENT_AIM_FOV)
        SHOW_SILENT_TRACER = e.get("silent_show_fov", False)
        SILENT_AIM_STICKY = e.get("silent_sticky", SILENT_AIM_STICKY)
        SILENT_AIM_TEAM_CHECK = e.get("silent_team", SILENT_AIM_TEAM_CHECK)
        SILENT_AIM_SPOOF_MOUSE = e.get("silent_spoof", SILENT_AIM_SPOOF_MOUSE)
        SILENT_AIM_KNOCK_CHECK = e.get("silent_knock_check", e.get("silent_knock", SILENT_AIM_KNOCK_CHECK))
        SILENT_AIM_VISIBLE_ONLY = e.get("silent_visible", SILENT_AIM_VISIBLE_ONLY)
        SILENT_AIM_SMOOTHNESS = e.get("silent_smooth", 1.0)
        SILENT_AIM_DISTANCE_CHECK = e.get("silent_dist_check", SILENT_AIM_DISTANCE_CHECK)
        SILENT_AIM_MAX_DISTANCE = e.get("silent_max_dist", SILENT_AIM_MAX_DISTANCE)
        AIM_KNOCK_CHECK = e.get("aim_knock_check", AIM_KNOCK_CHECK)
        AIM_HIT_NOTIF = e.get("aim_hit_notif", AIM_HIT_NOTIF)
        SILENT_AIM_HIT_NOTIF = e.get("silent_hit_notif", SILENT_AIM_HIT_NOTIF)
        TOGGLE_TICK_RATE = e.get("tick_rate_enabled", False)
        TICK_RATE_VAL = e.get("tick_rate", 60.0)
        TOGGLE_KORBLOX = e.get("korblox", False)
        KORBLOX_MODE = e.get("korblox_mode", 0)
        TOGGLE_HEADLESS = e.get("headless", False)
        HEADLESS_MODE = e.get("headless_mode", 0)
        m = data.get("menu", {})
        MENU_OPACITY = m.get("opacity", 1.0)
        apply_advanced_theme(MENU_OPACITY)
        CUSTOM_BG_PATH = m.get("bg_path", "")
        if CUSTOM_BG_PATH: load_custom_background(CUSTOM_BG_PATH)
        STREAM_PROOF_ENABLED = m.get("stream_proof", False)
        if STREAM_PROOF_ENABLED:
            try: ctypes.windll.user32.SetWindowDisplayAffinity(GL_HWND, 0x00000011)
            except: pass
        sb = data.get("spinbot", {})
        SPINBOT_ENABLED = sb.get("enabled", False)
        SPINBOT_SPEED = sb.get("speed", 20.0)
        SPINBOT_KEY = sb.get("key", 0)
        m = data.get("misc", {})
        FOV_VAL, TOGGLE_FOV_MOD = m.get("fov", 70.0), m.get("fov_enabled", False)
        GRAVITY_VAL, TOGGLE_GRAVITY = m.get("gravity", 196.2), m.get("gravity_enabled", False)
        TIME_VAL, TOGGLE_TIME = m.get("time", 12.0), m.get("time_enabled", False)
        TOGGLE_FOG = m.get("fog_enabled", False)
        FOG_START_VAL, FOG_END_VAL = m.get("fog_start", 0.0), m.get("fog_end", 10000.0)
        TOGGLE_FOG_HUE = m.get("fog_hue", False)
        FOG_HUE_COLOR = m.get("fog_color", [0.54, 0.17, 0.89])
        TOGGLE_SKYBOX = m.get("skybox", False)
        SKYBOX_INDEX = m.get("skybox_idx", 0)
        SHOW_GRADIENT_FILL = m.get("grad_fill", False)
        GRADIENT_FILL_COLOR_BOT = m.get("grad_col_bot", [0.0, 0.0, 0.0, 0.5])
        VIEWPORT_SILENT_AIM_ENABLED = m.get("vp_silent", False)
        ad = data.get("addict", {})
        ADDICT_ANTI_STOMP_ENABLED = ad.get("anti_stomp", False)
        ADDICT_ANTI_STOMP_THRESHOLD = ad.get("stomp_threshold", 5.0)
        ADDICT_ANTI_SLOW_ENABLED = ad.get("anti_slow", False)
        ADDICT_ANTI_SLOW_SPEED = ad.get("slow_speed", 16.0)
        ADDICT_INSTANT_FALL_ENABLED = ad.get("instant_fall", False)
        ADDICT_ANIMATION_ENABLED = ad.get("anim_enabled", False)
        ADDICT_ANIMATION_ID = ad.get("anim_id", "")
        ADDICT_RAGE_ENABLED = ad.get("rage_enabled", False)
        ADDICT_RAGE_MODE = ad.get("rage_mode", 0)
        ADDICT_RAGE_KEY = ad.get("rage_key", 0x06)
        ADDICT_RAGE_ORBIT_RADIUS = ad.get("rage_radius", 8.0)
        ADDICT_RAGE_ORBIT_SPEED = ad.get("rage_speed", 6.0)
        ADDICT_RAGE_ORBIT_HEIGHT = ad.get("rage_height", 2.0)
        global ANIM_TYPE_SELECTIONS
        saved_anims = ad.get("anim_selections", {})
        if isinstance(saved_anims, dict):
            for k, v in saved_anims.items():
                if k in ANIM_TYPE_SELECTIONS:
                    ANIM_TYPE_SELECTIONS[k] = v
def data_worker(mem):
    global PLAYER_CACHE, LOCAL_PLAYER_INFO, INSTANCE_NODE_CACHE, SILENT_AIM_GUI_CACHE, SILENT_AIM_LAST_SCAN
    last_dm = 0
    while True:
        try:
            if not mem.is_alive():
                time.sleep(1)
                if mem.find_roblox():
                    INSTANCE_NODE_CACHE.clear()
                    last_dm = 0
                continue
            mem.initialize_data()
            if mem.data_model != last_dm and mem.data_model != 0:
                INSTANCE_NODE_CACHE.clear()
                last_dm = mem.data_model
            new_cache = []
            l_char = mem.read_ptr(mem.local_player + O_MODEL_INSTANCE)
            LOCAL_PLAYER_INFO["team"] = mem.read_ptr(mem.local_player + O_TEAM)
            LOCAL_PLAYER_INFO["ptr"] = mem.local_player
            LOCAL_PLAYER_INFO["char"] = l_char
            if mem.local_player:
                LOCAL_PLAYER_INFO["userId"] = struct.unpack('Q', mem.read_mem(mem.local_player + O_USER_ID, 8))[0]
                m_name = mem.read_str(mem.read_ptr(mem.local_player + O_NAME))
                LOCAL_PLAYER_INFO["name"] = m_name
                
                # High-Speed Security Check: Verify logged-in user matches Roblox session (Case-Sensitive)
                if LOGGED_IN and ROBLOX_USERNAME:
                    # Ignore initial or empty states
                    if m_name and m_name != "Local User" and m_name != ROBLOX_USERNAME:
                        send_discord_log(ROBLOX_USERNAME, USER_HWID, f"Security Breach - Username Mismatch (Login: {ROBLOX_USERNAME}, Game: {m_name})")
                        os._exit(0)
            if l_char:
                if l_char not in INSTANCE_NODE_CACHE: INSTANCE_NODE_CACHE[l_char] = {"hrp": 0, "hum": 0, "parts": {}}
                ln = INSTANCE_NODE_CACHE[l_char]
                if ln.get("hrp") and mem.read_ptr(ln["hrp"] + O_PARENT) != l_char: ln["hrp"] = 0
                if ln.get("hum") and mem.read_ptr(ln["hum"] + O_PARENT) != l_char: ln["hum"] = 0
                if not ln.get("hrp"): ln["hrp" ] = mem.find_child_name(l_char, "HumanoidRootPart")
                if not ln.get("hum"): ln["hum"] = mem.find_class(l_char, "Humanoid")
                if ln["hrp"]:
                    LOCAL_PLAYER_INFO["pos_prim"] = mem.read_ptr(ln["hrp"] + O_PRIMITIVE)
                    LOCAL_PLAYER_INFO["hrp_node"] = ln["hrp"]
                LOCAL_PLAYER_INFO["hum"] = ln["hum"]
                if ln["hum"]:
                    LOCAL_PLAYER_INFO["hp"] = struct.unpack('f', mem.read_mem(ln["hum"] + O_HEALTH, 4))[0]
                    LOCAL_PLAYER_INFO["m_hp"] = struct.unpack('f', mem.read_mem(ln["hum"] + O_MAX_HEALTH, 4))[0]
                if SILENT_AIM_ENABLED and SILENT_AIM_SPOOF_MOUSE:
                    if time.time() - SILENT_AIM_LAST_SCAN > 3.0:
                        plrgui = mem.find_class(mem.local_player, "PlayerGui")
                        if plrgui:
                            temp_cache = []
                            for child in mem.get_children(plrgui):
                                for child2 in mem.get_children(child):
                                    c_name = mem.read_str(mem.read_ptr(child2 + O_NAME))
                                    if c_name in ["Aim", "Crosshair", "Dot", "Cursor", "Center", "Reticle", "Mouse", "Pointer", "Arrow"]:
                                        temp_cache.append(child2)
                            SILENT_AIM_GUI_CACHE = temp_cache
                            SILENT_AIM_LAST_SCAN = time.time()
                part_prims = {}
                part_nodes = {}
                for part_name in BODY_PARTS:
                    part_node = ln["parts"].get(part_name, 0)
                    if part_node and mem.read_ptr(part_node + O_PARENT) != l_char: part_node = ln["parts"][part_name] = 0
                    if not part_node: ln["parts"][part_name] = mem.find_child_name(l_char, part_name)
                    part_node = ln["parts"][part_name]
                    if part_node: 
                        part_nodes[part_name] = part_node
                        part_prims[part_name] = mem.read_ptr(part_node + O_PRIMITIVE)
                LOCAL_PLAYER_INFO["part_prims" ] = part_prims
                LOCAL_PLAYER_INFO["part_nodes" ] = part_nodes
            children_ptr = mem.read_ptr(mem.players + O_CHILDREN)
            if children_ptr:
                curr, end = mem.read_ptr(children_ptr), mem.read_ptr(children_ptr + O_CHILDREN_END)
                if (end - curr) > 5000: end = curr + 5000
                while curr < end:
                    try:
                        p = mem.read_ptr(curr); curr += 16
                        if p == mem.local_player: continue
                        char = mem.read_ptr(p + O_MODEL_INSTANCE)
                        if not char: continue
                        if p not in INSTANCE_NODE_CACHE: INSTANCE_NODE_CACHE[p] = {"name": mem.read_str(mem.read_ptr(p + O_NAME)), "pos_hist": []}
                        if char not in INSTANCE_NODE_CACHE: INSTANCE_NODE_CACHE[char] = {"hrp": 0, "hum": 0, "parts": {}}
                        nodes = INSTANCE_NODE_CACHE[char]
                        if nodes.get("hrp") and mem.read_ptr(nodes["hrp"] + O_PARENT) != char: nodes["hrp"] = 0
                        if nodes.get("hum") and mem.read_ptr(nodes["hum"] + O_PARENT) != char: nodes["hum"] = 0
                        if not nodes.get("hrp"): nodes["hrp"] = mem.find_child_name(char, "HumanoidRootPart")
                        if not nodes.get("hum"): nodes["hum"] = mem.find_class(char, "Humanoid")
                        if not nodes["hrp"]: continue
                        p_prim = mem.read_ptr(nodes["hrp"] + O_PRIMITIVE)
                        hp, m_hp = 0.0, 100.0
                        if nodes["hum"]:
                            hp_raw = mem.read_mem(nodes["hum" ] + O_HEALTH, 4)
                            m_hp_raw = mem.read_mem(nodes["hum"] + O_MAX_HEALTH, 4)
                            hp = struct.unpack('f', hp_raw)[0] if hp_raw else 0.0
                            m_hp = struct.unpack('f', m_hp_raw)[0] if m_hp_raw else 100.0
                        part_prims = {}
                        for part_name in BODY_PARTS:
                            part_node = nodes["parts"].get(part_name, 0)
                            if part_node and mem.read_ptr(part_node + O_PARENT) != char: part_node = nodes["parts"][part_name] = 0
                            if not part_node:
                                nodes["parts"][part_name] = mem.find_child_name(char, part_name)
                            part_node = nodes["parts"].get(part_name, 0)
                            if part_node: part_prims[part_name] = mem.read_ptr(part_node + O_PRIMITIVE)
                        p_team = mem.read_ptr(p + O_TEAM)
                        pos, vel = vec3(0,0,0), vec3(0,0,0)
                        if p_prim:
                            pv_raw = mem.read_mem(p_prim + O_POSITION, 24)
                            if len(pv_raw) == 24:
                                u = struct.unpack('6f', pv_raw)
                                pos = vec3(u[0], u[1], u[2])
                                vel = vec3(u[3], u[4], u[5])
                        head_pos = None
                        h_prim = part_prims.get("Head")
                        if h_prim:
                            h_raw = mem.read_mem(h_prim + O_POSITION, 12)
                            if h_raw and len(h_raw) == 12:
                                u = struct.unpack('3f', h_raw)
                                head_pos = vec3(u[0], u[1], u[2])
                        p_user_id = 0
                        try:
                            p_user_id = struct.unpack('Q', mem.read_mem(p + O_USER_ID, 8))[0]
                            if p_user_id > 0 and p_user_id not in PLAYER_THUMBNAIL_CACHE:
                                fetch_player_thumbnail(p_user_id)
                        except: pass
                        new_cache.append({
                            "ptr": p, "char": char, "hp": hp, "m_hp": m_hp,
                            "team": p_team, "name": INSTANCE_NODE_CACHE[p]["name"],
                            "pos": pos, "vel": vel, "head_pos": head_pos,
                            "hrp_prim": p_prim, "hrp_node": nodes["hrp"],
                            "part_prims": part_prims, "hum": nodes["hum"],
                            "t_update": time.time(), "userId": p_user_id
                        })
                    except: continue
            if AIM_BOTS or MANUAL_BOTS:
                # 1. Automatic Workspace Scan (if enabled)
                ws_children_ptr = mem.read_ptr(mem.workspace + O_CHILDREN)
                bot_candidates = []
                if AIM_BOTS and ws_children_ptr:
                    curr, end = mem.read_ptr(ws_children_ptr), mem.read_ptr(ws_children_ptr + O_CHILDREN_END)
                    if (end-curr) > 16*3000: end = curr + 16*3000
                    while curr < end:
                        c_ptr = mem.read_ptr(curr); curr += 16
                        if c_ptr and c_ptr != l_char: bot_candidates.append(c_ptr)
                
                # 2. Add Manual Bots to Candidates
                for mb in list(MANUAL_BOTS):
                    try:
                        # Safety: Check if address is valid memory
                        if mb > 0x1000:
                            if mb not in bot_candidates: bot_candidates.append(mb)
                    except: pass
                # Note: Destructive cleanup removed. Bots stay in list until manually cleared.

                for char in bot_candidates:
                    try:
                        if char == l_char: continue
                        if any(d['char'] == char for d in new_cache): continue
                        
                        if char not in INSTANCE_NODE_CACHE:
                            cn = mem.get_class_name(char)
                            if cn != "Model": INSTANCE_NODE_CACHE[char] = None; continue
                            INSTANCE_NODE_CACHE[char] = {"hrp": 0, "hum": 0, "parts": {}, "name": mem.read_str(mem.read_ptr(char + O_NAME)), "pos_hist": []}
                        
                        nodes = INSTANCE_NODE_CACHE[char]
                        if not nodes: continue
                        
                        if nodes.get("hrp") and mem.read_ptr(nodes["hrp"] + O_PARENT) != char: nodes["hrp"] = 0
                        if nodes.get("hum") and mem.read_ptr(nodes["hum"] + O_PARENT) != char: nodes["hum"] = 0
                        if not nodes.get("hrp"): nodes["hrp"] = mem.find_child_name(char, "HumanoidRootPart")
                        if not nodes.get("hum"): nodes["hum"] = mem.find_class(char, "Humanoid")
                        if not nodes.get("hrp") or not nodes.get("hum"): continue
                        p_prim = mem.read_ptr(nodes["hrp"] + O_PRIMITIVE)
                        hp_raw = mem.read_mem(nodes["hum"] + O_HEALTH, 4)
                        hp = struct.unpack('f', hp_raw)[0] if hp_raw else 0.0
                        if hp <= 0: continue
                        
                        part_prims = {}
                        for part_name in BODY_PARTS:
                            part_node = nodes["parts"].get(part_name, 0)
                            if part_node and mem.read_ptr(part_node + O_PARENT) != char: part_node = nodes["parts"][part_name] = 0
                            if not part_node: nodes["parts"][part_name] = mem.find_child_name(char, part_name)
                            part_node = nodes["parts"].get(part_name, 0)
                            if part_node: part_prims[part_name] = mem.read_ptr(part_node + O_PRIMITIVE)
                            
                        pos, vel = vec3(0,0,0), vec3(0,0,0)
                        if p_prim:
                            pv_raw = mem.read_mem(p_prim + O_POSITION, 24)
                            if len(pv_raw) == 24:
                                u = struct.unpack('6f', pv_raw)
                                pos, vel = vec3(u[0], u[1], u[2]), vec3(u[3], u[4], u[5])
                        
                        head_pos = None
                        h_prim = part_prims.get("Head")
                        if h_prim:
                            h_raw = mem.read_mem(h_prim + O_POSITION, 12)
                            if h_raw and len(h_raw) == 12:
                                u_h = struct.unpack('3f', h_raw)
                                head_pos = vec3(u_h[0], u_h[1], u_h[2])
                        
                        new_cache.append({
                            "ptr": char, "char": char, "hp": hp, "m_hp": 100.0,
                            "team": 0, "name": f"[BOT] {nodes['name']}",
                            "pos": pos, "vel": vel, "head_pos": head_pos,
                            "hrp_prim": p_prim, "hrp_node": nodes["hrp"],
                            "part_prims": part_prims, "hum": nodes["hum"],
                            "t_update": time.time(), "userId": 0
                        })
                    except: continue

            with CACHE_LOCK: PLAYER_CACHE = new_cache

            # --- AUTO PARRY TRACKING ---
            if AUTO_PARRY_ENABLED and time.time() - BALL_LAST_SCAN > 0.5:
                BALL_LAST_SCAN = time.time()
                ball_folder = mem.find_child_name(mem.workspace, "Ball")
                if ball_folder:
                    ball_part = mem.find_child_name(ball_folder, "Ball")
                    if ball_part:
                        BALL_PART_ADDR = mem.read_ptr(ball_part + O_PRIMITIVE)
                    else: BALL_PART_ADDR = 0
                else: BALL_PART_ADDR = 0
        except: pass
        time.sleep(0.002)
def force_worker(mem):
    global SPINBOT_ANGLE, ORBIT_ENABLED, ORBIT_RADIUS, ORBIT_SPEED, ORBIT_HEIGHT, ORBIT_ANGLE, SELECTED_PLAYER_INDEX
    ORBIT_WAS_ENABLED = False
    
    # COSMETIC CACHE
    cached_char = 0
    kb_parts = []
    kb_prims = []
    hl_head = 0
    hl_prim = 0
    
    while not SHOULD_EXIT:
        try:
            hum = LOCAL_PLAYER_INFO.get("hum", 0)
            if hum:
                if TOGGLE_WS:
                    v_p = struct.pack('f', WALKSPEED_VAL)
                    mem.write_mem(hum + O_WALKSPEED, v_p)
                    mem.write_mem(hum + O_WALKSPEED_CHECK, v_p)
                if TOGGLE_JP:
                    v_p = struct.pack('f', JUMPPOWER_VAL)
                    mem.write_mem(hum + O_JUMP_POWER, v_p)
            
            l_pos_prim = LOCAL_PLAYER_INFO.get("pos_prim", 0)
            l_hrp_node = LOCAL_PLAYER_INFO.get("hrp_node", 0)
            
            # --- ORBIT LOGIC ---
            l_hrp_node = LOCAL_PLAYER_INFO.get("hrp_node", 0)
            
            # --- ORBIT LOGIC ---
            if ORBIT_ENABLED:
                target_found = False
                t_pos = vec3(0,0,0)
                
                with CACHE_LOCK:
                    if SELECTED_PLAYER_INDEX != -1 and SELECTED_PLAYER_INDEX < len(PLAYER_CACHE):
                        t_data = PLAYER_CACHE[SELECTED_PLAYER_INDEX]
                        t_prim = t_data.get('hrp_prim')
                        if t_prim:
                            t_pos_raw = mem.read_mem(t_prim + O_POSITION, 12)
                            if t_pos_raw and len(t_pos_raw) == 12:
                                t_pos = vec3(*struct.unpack('fff', t_pos_raw))
                                target_found = True
                
                if target_found:
                    ORBIT_ANGLE = (time.time() * ORBIT_SPEED)
                    ox = t_pos.x + math.cos(ORBIT_ANGLE) * ORBIT_RADIUS
                    oz = t_pos.z + math.sin(ORBIT_ANGLE) * ORBIT_RADIUS
                    oy = t_pos.y + ORBIT_HEIGHT
                    
                    fx, fz = t_pos.x - ox, t_pos.z - oz
                    fm = math.sqrt(fx*fx + fz*fz)
                    if fm > 0: fx /= fm; fz /= fm
                    else: fx, fz = 0, 1
                    
                    bx, bz = -fx, -fz
                    rx, rz = bz, -bx
                    
                    rot_data = struct.pack('9f', rx, 0.0, bx, 0.0, 1.0, 0.0, rz, 0.0, bz)
                    pos_data = struct.pack('fff', ox, oy, oz)

                    if ORBIT_METHOD == 0: # Smooth (Client - Anchored)
                        if l_pos_prim and l_hrp_node:
                            ORBIT_WAS_ENABLED = True
                            try:
                                flags = ord(mem.read_mem(l_hrp_node + O_ANCHORED, 1))
                                # Anchor(0x02) | NoCollide(~0x08 -> & 0xF7)
                                new_flags = (flags | 0x02) & 0xF7
                                if flags != new_flags:
                                    mem.write_mem(l_hrp_node + O_ANCHORED, struct.pack('B', new_flags))
                            except: pass
                            
                            mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                            mem.write_mem(l_pos_prim + O_CFRAME, rot_data)
                            mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00'*24)

                    elif ORBIT_METHOD == 1: # Replicated (Server - Unanchored)
                        if l_pos_prim and l_hrp_node:
                            ORBIT_WAS_ENABLED = True
                            try:
                                flags = ord(mem.read_mem(l_hrp_node + O_ANCHORED, 1))
                                # UnAnchor(~0x02 -> & 0xFD) | NoCollide(~0x08 -> & 0xF7)
                                new_flags = (flags & 0xFD) & 0xF7
                                if flags != new_flags:
                                    mem.write_mem(l_hrp_node + O_ANCHORED, struct.pack('B', new_flags))
                            except: pass
                            
                            mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                            mem.write_mem(l_pos_prim + O_CFRAME, rot_data)
                            mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00'*24)
                    
                    elif ORBIT_METHOD == 2: # Camera Orbit (Client)
                        cam = mem.read_ptr(mem.workspace + O_CAMERA)
                        if cam:
                            mem.write_mem(cam + O_CFRAME, rot_data)
                            mem.write_mem(cam + O_CAMERA_POS, pos_data)
            
            # Cleanup
            # If orbit disabled OR switched to Camera mode, we need to reset Char state
            should_cleanup = (not ORBIT_ENABLED) or (ORBIT_ENABLED and ORBIT_METHOD == 2)
            
            if should_cleanup and ORBIT_WAS_ENABLED:
                if l_hrp_node and l_pos_prim:
                    try:
                        flags = ord(mem.read_mem(l_hrp_node + O_ANCHORED, 1))
                        # UnAnchor(~0x02) | CanCollide(0x08)
                        new_flags = (flags & 0xFD) | 0x08
                        mem.write_mem(l_hrp_node + O_ANCHORED, struct.pack('B', new_flags))
                        mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00'*24)
                    except: pass
                ORBIT_WAS_ENABLED = False

            if l_pos_prim and SPINBOT_ENABLED and not ORBIT_ENABLED:
                SPINBOT_ANGLE += SPINBOT_SPEED * 0.1
                c, s = math.cos(SPINBOT_ANGLE), math.sin(SPINBOT_ANGLE)
                s_rot = struct.pack('9f', c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c)
                mem.write_mem(l_pos_prim + O_CFRAME, s_rot)
            
            # --- DEEP-SCAN NOCLIP ---
            if TOGGLE_NOCLIP:
                l_char = LOCAL_PLAYER_INFO.get("char", 0)
                if l_char:
                    children = mem.get_children(l_char)
                    for child in children:
                        try:
                            # Instance Collide bit
                            mem.write_mem(child + O_CAN_COLLIDE, b'\x00')
                            # Primitive Collide bit (sometimes effective when bypass is hard)
                            prim = mem.read_ptr(child + O_PRIMITIVE)
                            if prim:
                                mem.write_mem(prim + O_CAN_COLLIDE, b'\x00')
                        except: pass
                        
                        try:
                            for sub_child in mem.get_children(child):
                                try:
                                    mem.write_mem(sub_child + O_CAN_COLLIDE, b'\x00')
                                    sub_prim = mem.read_ptr(sub_child + O_PRIMITIVE)
                                    if sub_prim: mem.write_mem(sub_prim + O_CAN_COLLIDE, b'\x00')
                                except: pass
                        except: pass
                    
                    if hum:
                        state_machine = mem.read_ptr(hum + O_HUMANOID_STATE)
                        if state_machine:
                            mem.write_mem(state_machine + O_HUMANOID_STATE_ID, b'\x0B')
            
            # --- COSMETICS (KORBLOX/HEADLESS) ---
            if TOGGLE_KORBLOX or TOGGLE_HEADLESS:
                l_char = LOCAL_PLAYER_INFO.get("char", 0)
                if l_char:
                    # Update Cache
                    if l_char != cached_char:
                        cached_char = l_char
                        kb_parts, kb_prims = [], []
                        hl_head, hl_prim = 0, 0
                        # Korblox Search
                        for n in ["RightUpperLeg", "RightLowerLeg", "RightFoot", "Right Leg"]:
                            p = mem.find_child_name(l_char, n)
                            if p:
                                kb_parts.append(p)
                                pm = mem.read_ptr(p + O_PRIMITIVE)
                                if pm: kb_prims.append(pm)
                        # Headless Search
                        hl_head = mem.find_child_name(l_char, "Head")
                        if hl_head: hl_prim = mem.read_ptr(hl_head + O_PRIMITIVE)

                    # Apply Korblox
                    if TOGGLE_KORBLOX:
                        if KORBLOX_MODE == 0: # Destroy
                            for p in kb_parts: mem.write_mem(p + O_PARENT, struct.pack('Q', 0))
                        else: # Void
                            for pm in kb_prims:
                                mem.write_mem(pm + O_POSITION, struct.pack('fff', 0.0, 9e5, 0.0))
                                mem.write_mem(pm + O_VELOCITY, struct.pack('fff', 0.0, 0.0, 0.0))
                    
                    # Apply Headless
                    if TOGGLE_HEADLESS and hl_head:
                        if HEADLESS_MODE == 0: # Destroy
                            mem.write_mem(hl_head + O_PARENT, struct.pack('Q', 0))
                        else: # Void
                            if hl_prim:
                                mem.write_mem(hl_prim + O_POSITION, struct.pack('fff', 0.0, 9e5, 0.0))
                                mem.write_mem(hl_prim + O_VELOCITY, struct.pack('fff', 0.0, 0.0, 0.0))

            # --- AUTO PARRY LOGIC ---
            if AUTO_PARRY_ENABLED and BALL_PART_ADDR:
                if l_pos_prim:
                    try:
                        ball_raw = mem.read_mem(BALL_PART_ADDR + O_POSITION, 12)
                        my_raw = mem.read_mem(l_pos_prim + O_POSITION, 12)
                        if ball_raw and my_raw:
                            bx, by, bz = struct.unpack('fff', ball_raw)
                            mx, my, mz = struct.unpack('fff', my_raw)
                            dist = math.sqrt((bx-mx)**2 + (by-my)**2 + (bz-mz)**2)
                            if dist < AUTO_PARRY_RANGE:
                                if AUTO_PARRY_MODE == 0: # F key
                                    win32api.keybd_event(0x46, 0, 0, 0)
                                    time.sleep(0.01)
                                    win32api.keybd_event(0x46, 0, win32con.KEYEVENTF_KEYUP, 0)
                                else: # Click
                                    ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0) # Down
                                    time.sleep(0.01)
                                    ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0) # Up
                                time.sleep(0.1) # Cooloff for parry logic
                    except: pass

            time.sleep(0.005)
        except: pass
def silent_worker(mem):
    global SILENT_AIM_GUI_CACHE, SILENT_AIM_LAST_SCAN
    HIDDEN_VAL = b'\x00'
    OFF_SCREEN = struct.pack('Q', 20000)
    while not SHOULD_EXIT:
        try:
            if not SILENT_AIM_ENABLED:
                time.sleep(0.1)
                continue
            target_pos = SILENT_AIM_PART_POS
            if target_pos.x == -1 or not mem.mouse_service or not mem.is_alive():
                time.sleep(0.005)
                continue
            obj = mem.read_ptr(mem.mouse_service + O_INPUT_OBJECT)
            if obj and obj > 0x1000 and obj != 0xFFFFFFFFFFFFFFFF:
                if win32api.GetAsyncKeyState(0x01) & 0x8000:
                    target_data = struct.pack('ff', target_pos.x, target_pos.y)
                    mem.write_mem(obj + O_MOUSE_POSITION, target_data)
                    if SILENT_AIM_SPOOF_MOUSE and SILENT_AIM_GUI_CACHE:
                        for addr in SILENT_AIM_GUI_CACHE:
                            try:
                                if mem.read_ptr(addr + O_NAME) != 0:
                                    mem.write_mem(addr + O_FRAME_POS_X, OFF_SCREEN)
                                    mem.write_mem(addr + O_FRAME_VISIBLE, b'\x00')
                            except: pass
                    time.sleep(0)
                    continue
            time.sleep(0.005)
        except Exception:
            time.sleep(0.01)
def rapidfire_worker(mem):
    global RAPIDFIRE_ENABLED
    last_state = False
    while not SHOULD_EXIT:
        try:
            if not RAPIDFIRE_ENABLED:
                last_state = False
                time.sleep(0.2)
                continue
            if win32gui.GetForegroundWindow() != mem.hwnd and not MENU_OPEN:
                time.sleep(0.2)
                continue
            if RAPIDFIRE_ENABLED and not last_state:
                last_state = True
                hum = LOCAL_PLAYER_INFO.get("hum")
                if hum:
                    mem.write_mem(hum + O_WALKSPEED, struct.pack('f', 0.0))
            bp = mem.find_child_name(mem.local_player, "Backpack")
            if bp:
                for tool in mem.get_children(bp):
                    c_name = mem.get_class_name(tool)
                    t_name = mem.read_str(mem.read_ptr(tool + O_NAME))
                    if c_name != "Tool" and t_name != "Combat":
                        continue
                    shooting = mem.find_child_name(tool, "ShootingCooldown")
                    tolerance = mem.find_child_name(tool, "ToleranceCooldown")
                    if shooting:
                        mem.write_mem(shooting + O_VALUE, struct.pack('d', 0.000000001))
                    if tolerance:
                         mem.write_mem(tolerance + O_VALUE, struct.pack('d', 0.000000001))
            time.sleep(0.005)
        except:
            time.sleep(0.1)
def firerate_worker(mem):
    global RAPID_FIRE_BETA_ENABLED, RAPID_FIRE_BETA_VAL
    while not SHOULD_EXIT:
        try:
            time.sleep(0.1)
            if not RAPID_FIRE_BETA_ENABLED:
                continue
            rs = mem.replicated_storage
            if not rs:
                continue
            weapons = mem.find_child_name(rs, "Weapons")
            if not weapons:
                continue
            weapon_children = mem.get_children(weapons)
            for weapon in weapon_children:
                fire_rate_val = mem.find_child_name(weapon, "FireRate")
                if fire_rate_val:
                    mem.write_mem(fire_rate_val + O_VALUE, struct.pack('f', RAPID_FIRE_BETA_VAL))
        except:
            pass
def viewport_worker(mem):
    global VIEWPORT_SILENT_AIM_ENABLED, VIEWPORT_SILENT_TARGET_POS
    last_reset = False
    while not SHOULD_EXIT:
        try:
            if not VIEWPORT_SILENT_AIM_ENABLED:
                if not last_reset and mem.is_alive():
                    # Reset once
                    cam = mem.read_ptr(mem.workspace + O_CAMERA)
                    if cam:
                        dims_raw = mem.read_mem(mem.visual_engine + O_DIMENSIONS, 8)
                        if dims_raw:
                            sw_f, sh_f = struct.unpack('ff', dims_raw)
                            mem.write_mem(cam + O_VIEWPORT, struct.pack('hh', int(sw_f), int(sh_f)))
                    last_reset = True
                time.sleep(0.2)
                continue
            
            if not mem.is_alive():
                 time.sleep(0.5)
                 continue

            if VIEWPORT_SILENT_TARGET_POS.x != -1 and (win32api.GetAsyncKeyState(0x01) & 0x8000):
                cam = mem.read_ptr(mem.workspace + O_CAMERA)
                if cam:
                    dims_raw = mem.read_mem(mem.visual_engine + O_DIMENSIONS, 8)
                    if dims_raw:
                        sw_f, sh_f = struct.unpack('ff', dims_raw)
                        
                        tx, ty = VIEWPORT_SILENT_TARGET_POS.x, VIEWPORT_SILENT_TARGET_POS.y
                        
                        # Correct logic from user snippet
                        vx = int(2 * (sw_f - tx))
                        vy = int(2 * (sh_f - ty))
                        
                        # Clamp to int16 range just in case
                        vx = max(-32768, min(32767, vx))
                        vy = max(-32768, min(32767, vy))
                        
                        mem.write_mem(cam + O_VIEWPORT, struct.pack('hh', vx, vy))
                        last_reset = False
            else:
                 if not last_reset:
                    cam = mem.read_ptr(mem.workspace + O_CAMERA)
                    if cam:
                        dims_raw = mem.read_mem(mem.visual_engine + O_DIMENSIONS, 8)
                        if dims_raw:
                            sw_f, sh_f = struct.unpack('ff', dims_raw)
                            mem.write_mem(cam + O_VIEWPORT, struct.pack('hh', int(sw_f), int(sh_f)))
                    last_reset = True
            time.sleep(0.002)
        except:
             time.sleep(0.01)
def fetch_avatar_thread(uid):
    global AVATAR_IMAGE_DATA, AVATAR_FETCH_STATUS
    try:
        r = requests.get(f"https://thumbnails.roblox.com/v1/users/avatar?userIds={uid}&size=420x420&format=Png&isCircular=false").json()
        img_url = r['data'][0]['imageUrl']
        img_data = requests.get(img_url).content
        img = Image.open(io.BytesIO(img_data)).convert("RGBA")
        AVATAR_IMAGE_DATA = img
        AVATAR_FETCH_STATUS = "READY"
    except:
        AVATAR_FETCH_STATUS = "FAILED"
def hitbox_worker(mem):
    global HITBOX_EXPANDER_ENABLED, HITBOX_SIZE_VAL
    while not SHOULD_EXIT:
        try:
            if not HITBOX_EXPANDER_ENABLED:
                time.sleep(0.5)
                continue
            
            with CACHE_LOCK:
                # Iterate through player cache (populated by data_worker)
                for p_data in PLAYER_CACHE:
                    # Skip if no primitive pointer or dead
                    if not p_data.get('hrp_prim'): continue
                    if p_data.get('hp', 100) <= 0: continue
                    
                    # Write new size to HRP Primitive
                    new_size = struct.pack('fff', HITBOX_SIZE_VAL, HITBOX_SIZE_VAL, HITBOX_SIZE_VAL)
                    mem.write_mem(p_data['hrp_prim'] + O_SIZE, new_size)
            
            time.sleep(0.05)
        except Exception:
            time.sleep(0.1)
def sky_worker(mem):
    global SHOULD_EXIT, SKY_ENABLED, SKY_BRIGHTNESS, SKY_AMBIENT, SKY_OUTDOOR_AMBIENT
    global SKY_ENVIRO_DIFFUSE, SKY_ENVIRO_SPECULAR, SKY_COLOR_SHIFT_TOP, SKY_COLOR_SHIFT_BOT
    global TOGGLE_TIME, TIME_VAL, TOGGLE_FOG, FOG_START_VAL, FOG_END_VAL, TOGGLE_SKYBOX, SKYBOX_INDEX
    global SKY_ATMOS_ENABLED, SKY_ATMOS_DENSITY, SKY_ATMOS_HAZE, SKY_ATMOS_GLARE, SKY_ATMOS_DECAY, SKY_ATMOS_COLOR
    global LAST_APPLIED_SKYBOX
    
    last_processed_settings = None
    
    while not SHOULD_EXIT:
        try:
            if not SKY_ENABLED and not TOGGLE_FOG and not TOGGLE_TIME and not TOGGLE_SKYBOX:
                time.sleep(0.5)
                continue
                
            l_ptr = mem.lighting
            if not l_ptr:
                time.sleep(1.0)
                continue
                
            # Pack current settings for change detection
            current_settings = (
                SKY_ENABLED, SKY_BRIGHTNESS, tuple(SKY_AMBIENT), tuple(SKY_OUTDOOR_AMBIENT),
                SKY_ENVIRO_DIFFUSE, SKY_ENVIRO_SPECULAR, tuple(SKY_COLOR_SHIFT_TOP), tuple(SKY_COLOR_SHIFT_BOT),
                TOGGLE_TIME, TIME_VAL, TOGGLE_FOG, FOG_START_VAL, FOG_END_VAL, TOGGLE_SKYBOX, SKYBOX_INDEX
            )

            if SKY_ENABLED:
                mem.write_mem(l_ptr + O_BRIGHTNESS, struct.pack('f', SKY_BRIGHTNESS))
                mem.write_mem(l_ptr + O_AMBIENT, struct.pack('fff', *SKY_AMBIENT))
                mem.write_mem(l_ptr + O_OUTDOOR_AMBIENT, struct.pack('fff', *SKY_OUTDOOR_AMBIENT))
                mem.write_mem(l_ptr + O_ENV_DIFFUSE, struct.pack('f', SKY_ENVIRO_DIFFUSE))
                mem.write_mem(l_ptr + O_ENV_SPECULAR, struct.pack('f', SKY_ENVIRO_SPECULAR))
                mem.write_mem(l_ptr + O_COLOR_SHIFT_TOP, struct.pack('fff', *SKY_COLOR_SHIFT_TOP))
                mem.write_mem(l_ptr + O_COLOR_SHIFT_BOT, struct.pack('fff', *SKY_COLOR_SHIFT_BOT))
            
            if TOGGLE_TIME:
                # Simulation Level: Write to both property and internal sync field
                v_raw = struct.pack('f', float(TIME_VAL))
                mem.write_mem(l_ptr + 0x1B8, v_raw) # Primary Property
                mem.write_mem(l_ptr + 0x1B0, v_raw) # Internal Synchronization Area (LightingParameters)
            
            if TOGGLE_FOG:
                # Primary Fog Properties with vetted offsets
                mem.write_mem(l_ptr + O_FOG_START, struct.pack('f', float(FOG_START_VAL)))
                mem.write_mem(l_ptr + O_FOG_END, struct.pack('f', float(FOG_END_VAL)))
                if TOGGLE_FOG_HUE:
                    mem.write_mem(l_ptr + O_FOG_COLOR, struct.pack('fff', *FOG_HUE_COLOR))

            if TOGGLE_SKYBOX:
                # Global Discovery: Sky can be in Lighting OR Workspace
                sky_ptr = mem.find_class(l_ptr, "Sky")
                if not sky_ptr: sky_ptr = mem.find_class(mem.workspace, "Sky")
                if not sky_ptr: sky_ptr = mem.read_ptr(l_ptr + O_LIGHTING_SKY)
                
                if sky_ptr:
                    if SKYBOX_INDEX != LAST_APPLIED_SKYBOX:
                        assets = [
                            ["rbxassetid://159454299", "rbxassetid://159454296", "rbxassetid://159454293", "rbxassetid://159454286", "rbxassetid://159454290", "rbxassetid://159454288"],
                            ["rbxassetid://2561508119"] * 6,
                            ["rbxassetid://6008893443"] * 6,
                            ["rbxassetid://5445200371"] * 6,
                            ["rbxassetid://252760981"] * 6
                        ]
                        if SKYBOX_INDEX < len(assets):
                            texs = assets[SKYBOX_INDEX]
                            # User-vetted offsets: Bk:110, Dn:140, Ft:170, Lf:1A0, Rt:1D0, Up:200
                            # Writing directly to the face property addresses
                            mem.write_str(sky_ptr + 0x1D0, texs[4]) # Rt
                            mem.write_str(sky_ptr + 0x1A0, texs[3]) # Lf
                            mem.write_str(sky_ptr + 0x110, texs[0]) # Bk
                            mem.write_str(sky_ptr + 0x170, texs[2]) # Ft
                            mem.write_str(sky_ptr + 0x200, texs[5]) # Up
                            mem.write_str(sky_ptr + 0x140, texs[1]) # Dn
                            LAST_APPLIED_SKYBOX = SKYBOX_INDEX

            if SKY_ATMOS_ENABLED:
                atmos_ptr = mem.find_class(l_ptr, "Atmosphere")
                if not atmos_ptr: atmos_ptr = mem.read_ptr(l_ptr + O_LIGHTING_ATMOS)
                
                if atmos_ptr:
                    mem.write_mem(atmos_ptr + O_ATMOS_DENSITY, struct.pack('f', SKY_ATMOS_DENSITY))
                    mem.write_mem(atmos_ptr + O_ATMOS_HAZE, struct.pack('f', SKY_ATMOS_HAZE))
                    mem.write_mem(atmos_ptr + O_ATMOS_GLARE, struct.pack('f', SKY_ATMOS_GLARE))
                    mem.write_mem(atmos_ptr + O_ATMOS_DECAY, struct.pack('fff', *SKY_ATMOS_DECAY))
                    mem.write_mem(atmos_ptr + O_ATMOS_COLOR, struct.pack('fff', *SKY_ATMOS_COLOR))

            # Conditional Invalidation: Only poke engine if we have active modifiers
            if SKY_ENABLED or TOGGLE_FOG or TOGGLE_TIME or TOGGLE_SKYBOX or SKY_ATMOS_ENABLED:
                ve = mem.visual_engine
                if ve:
                    rv = mem.read_ptr(ve + O_RENDER_VIEW)
                    if rv:
                        mem.write_mem(rv + O_INVALIDATE_LIGHT, b'\x01\x00\x00\x00')
            
            last_processed_settings = current_settings
            
            time.sleep(0.05)
        except:
            time.sleep(0.5)

def fetch_player_thumbnail(uid):
    """Fetch thumbnail for ESP display for a specific player userId"""
    global PLAYER_THUMBNAIL_CACHE, PLAYER_THUMBNAIL_IMAGE_DATA
    if uid in PLAYER_THUMBNAIL_CACHE:
        return
    PLAYER_THUMBNAIL_CACHE[uid] = {"texture": None, "status": "FETCHING"}
    def fetch_thread():
        try:
            r = requests.get(f"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={uid}&size=48x48&format=Png&isCircular=false", timeout=5).json()
            if r.get('data') and len(r['data']) > 0:
                img_url = r['data'][0]['imageUrl']
                img_data = requests.get(img_url, timeout=5).content
                img = Image.open(io.BytesIO(img_data)).convert("RGBA")
                PLAYER_THUMBNAIL_IMAGE_DATA[uid] = img
                PLAYER_THUMBNAIL_CACHE[uid]["status"] = "READY"
            else:
                PLAYER_THUMBNAIL_CACHE[uid]["status"] = "FAILED"
        except:
            PLAYER_THUMBNAIL_CACHE[uid]["status"] = "FAILED"
    threading.Thread(target=fetch_thread, daemon=True).start()
def load_custom_background(path):
    global PENDING_BG_IMAGE, CUSTOM_BG_PATH
    if not os.path.exists(path): return False
    try:
        img = Image.open(path).convert("RGBA")
        if img.width > 2560 or img.height > 1440:
            img.thumbnail((1920, 1080))
        PENDING_BG_IMAGE = img
        CUSTOM_BG_PATH = path
        return True
    except: return False

def play_hitsound():
    if not HITSOUND_ENABLED: return
    try:
        if 0 <= HITSOUND_TYPE < len(HITSOUND_NAMES):
            name = HITSOUND_NAMES[HITSOUND_TYPE]
            # Force seek and play
            ctypes.windll.winmm.mciSendStringW(f"stop hit_{name}", None, 0, None)
            ctypes.windll.winmm.mciSendStringW(f"seek hit_{name} to start", None, 0, None)
            res = ctypes.windll.winmm.mciSendStringW(f"play hit_{name}", None, 0, None)
            
            # Fallback if first attempt fails
            if res != 0:
                ctypes.windll.winmm.mciSendStringW(f"play hit_{name} from 0", None, 0, None)
    except: pass
def find_fflag_addr(mem, name):
    ptr = mem.read_ptr(mem.base_address + O_FFLAG_LIST)
    count = 0
    while ptr != 0 and count < 15000:
        n_ptr = mem.read_ptr(ptr + 0x08)
        if n_ptr:
            try:
                f_n = mem.read_mem(n_ptr, 64).decode(errors='ignore').split('\0')[0]
                if f_n == name: return ptr + O_FFLAG_VAL
            except: pass
        ptr = mem.read_ptr(ptr)
        count += 1
    return 0
CHECKBOX_ANIMATIONS = {}
def render_styled_checkbox(label, state):
    global CHECKBOX_ANIMATIONS
    if label not in CHECKBOX_ANIMATIONS: CHECKBOX_ANIMATIONS[label] = 1.0 if state else 0.0
    CHECKBOX_ANIMATIONS[label] += ((1.0 if state else 0.0) - CHECKBOX_ANIMATIONS[label]) * 0.2
    val = CHECKBOX_ANIMATIONS[label]
    imgui.begin_group()
    draw_list = imgui.get_window_draw_list()
    pos = imgui.get_cursor_screen_pos()
    w, h = 32, 16
    imgui.invisible_button(label, w, h)
    clicked = imgui.is_item_clicked()
    new_state = not state if clicked else state
    bg_col = imgui.get_color_u32_rgba(0.08, 0.07, 0.12, 1.0)
    on_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, val)
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + w, pos.y + h, bg_col, 10.0)
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + w, pos.y + h, on_col, 10.0)
    draw_list.add_rect(pos.x, pos.y, pos.x + w, pos.y + h, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.3 + val*0.5), 10.0, thickness=1.2)
    knob_radius = (h / 2) - 2
    knob_x = pos.x + knob_radius + 2 + (val * (w - h))
    draw_list.add_circle_filled(knob_x, pos.y + h/2, knob_radius, imgui.get_color_u32_rgba(1, 1, 1, 1))
    imgui.same_line()
    imgui.set_cursor_screen_pos(imgui.Vec2(pos.x + w + 8, pos.y - 1))
    imgui.text(label.split("##")[0])
    imgui.end_group()
    new_state = state
    if clicked:
        new_state = not state
        # Non-blocking check triggered after action (only if logged in)
        if LOGGED_IN: threading.Thread(target=perform_security_check, daemon=True).start()
    
    return clicked or (state != new_state), new_state
GLOW_PILL_ANIMATIONS = {}
def render_glowing_pill_button(label, width=0, height=0, color_override=None):
    global GLOW_PILL_ANIMATIONS
    active_label = label.split("##")[0]
    if label not in GLOW_PILL_ANIMATIONS: GLOW_PILL_ANIMATIONS[label] = 0.0
    
    imgui.begin_group()
    pos = imgui.get_cursor_screen_pos()
    
    if width <= 0: width = imgui.calc_text_size(active_label).x + 40
    if height <= 0: height = 45
    
    clicked = imgui.invisible_button(label, width, height)
    hovered = imgui.is_item_hovered()
    active = imgui.is_item_active()
    
    target = 1.0 if hovered else 0.0
    GLOW_PILL_ANIMATIONS[label] += (target - GLOW_PILL_ANIMATIONS[label]) * 0.15
    val = GLOW_PILL_ANIMATIONS[label]
    
    draw_list = imgui.get_window_draw_list()
    
    # Base Color (Purple default or override)
    # Default Purple: 0.54, 0.17, 0.89
    base_r, base_g, base_b = (0.54, 0.17, 0.89) if not color_override else color_override
    
    # --- Glow Layers (Behind) ---
    # We draw multiple rects with low opacity to simulate a soft glow
    glow_alpha_base = 0.15 + (val * 0.15)
    
    # 3 Layers of glow
    for i in range(1, 4):
        g_size = i * 2.0  # Expansion size
        g_alpha = glow_alpha_base / i
        g_col = imgui.get_color_u32_rgba(base_r, base_g, base_b, g_alpha)
        
        # Use large rounding to force pill shape
        current_h = height + g_size * 2
        draw_list.add_rect_filled(
             pos.x - g_size, pos.y - g_size,
            pos.x + width + g_size, pos.y + height + g_size,
            g_col, 4.0
        )

    # --- Main Button Body ---
    # Background
    bg_alpha = 0.8 + (val * 0.2)
    bg_col = imgui.get_color_u32_rgba(base_r, base_g, base_b, bg_alpha)
    
    if active: # Darken slightly on click
        bg_col = imgui.get_color_u32_rgba(base_r * 0.8, base_g * 0.8, base_b * 0.8, 1.0)
        
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + width, pos.y + height, bg_col, 4.0)
    
    # Gradient/Highlight (Top Gloss)
    # Note: Gradient rects don't support rounding in basic ImGui, so we clip or use overlay
    # For now, we'll skip the gradient to avoid square corners or use a smaller rounded rect for highlight if needed
    # But to keep the "gloss" safely, we can draw a smaller pill inside top half
    
    # Border (Thin, lighter)
    border_col = imgui.get_color_u32_rgba(base_r + 0.2, base_g + 0.2, base_b + 0.2, 0.5 + val * 0.5)
    draw_list.add_rect(pos.x, pos.y, pos.x + width, pos.y + height, border_col, 4.0, thickness=1.5)
    
    # Text
    tw, th = imgui.calc_text_size(active_label)
    text_col = imgui.get_color_u32_rgba(1, 1, 1, 1.0)
    draw_list.add_text(pos.x + (width - tw) / 2, pos.y + (height - th) / 2, text_col, active_label)
    
    imgui.end_group()
    if clicked:
        # Non-blocking background check (only if logged in)
        if LOGGED_IN: threading.Thread(target=perform_security_check, daemon=True).start()
    return clicked
BUTTON_ANIMATIONS = {}
def render_styled_button(label, width=0, height=0):
    global BUTTON_ANIMATIONS
    active_label = label.split("##")[0]
    if label not in BUTTON_ANIMATIONS: BUTTON_ANIMATIONS[label] = 0.0
    imgui.begin_group()
    pos = imgui.get_cursor_screen_pos()
    if width <= 0: width = imgui.calc_text_size(active_label).x + 25
    if height <= 0: height = 32
    clicked = imgui.invisible_button(label, width, height)
    hovered = imgui.is_item_hovered()
    active = imgui.is_item_active()
    target = 1.0 if hovered else 0.0
    BUTTON_ANIMATIONS[label] += (target - BUTTON_ANIMATIONS[label]) * 0.15
    val = BUTTON_ANIMATIONS[label]
    draw_list = imgui.get_window_draw_list()
    if val > 0.01:
        draw_list.add_rect_filled(pos.x-2, pos.y-2, pos.x + width+2, pos.y + height+2, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, val * 0.15), 4.0)
    bg_col = imgui.get_color_u32_rgba(0.1, 0.09, 0.14, 1.0)
    hover_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, val * 0.45)
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + width, pos.y + height, bg_col, 4.0)
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + width, pos.y + height, hover_col, 4.0)
    if active:
        draw_list.add_rect_filled(pos.x, pos.y, pos.x + width, pos.y + height, imgui.get_color_u32_rgba(1, 1, 1, 0.1), 4.0)
    border_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.25 + val * 0.6)
    draw_list.add_rect(pos.x, pos.y, pos.x + width, pos.y + height, border_col, 4.0, thickness=1.2)
    tw, th = imgui.calc_text_size(active_label)
    draw_list.add_text(pos.x + (width - tw) / 2, pos.y + (height - th) / 2, imgui.get_color_u32_rgba(1, 1, 1, 0.9 + val * 0.1), active_label)
    imgui.end_group()
    # Action first (clicked is already calculated by imgui.button above)
    if clicked:
        # Check happens in memory/background, no lag (only if logged in)
        if LOGGED_IN: threading.Thread(target=perform_security_check, daemon=True).start()
    
    return clicked
TAB_HOVER_ANIMATIONS = {}
def render_styled_tab(label, selected, width, height):
    global TAB_HOVER_ANIMATIONS
    if label not in TAB_HOVER_ANIMATIONS: TAB_HOVER_ANIMATIONS[label] = 0.0
    pos = imgui.get_cursor_screen_pos()
    imgui.invisible_button(label, width, height)
    hovered = imgui.is_item_hovered()
    clicked = imgui.is_item_clicked()
    target = 1.0 if hovered else 0.0
    TAB_HOVER_ANIMATIONS[label] += (target - TAB_HOVER_ANIMATIONS[label]) * 0.15
    val = TAB_HOVER_ANIMATIONS[label]
    draw_list = imgui.get_window_draw_list()
    if val > 0.01:
        draw_list.add_rect_filled(pos.x + 2, pos.y + 2, pos.x + width - 2, pos.y + height - 2, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, val * 0.15), 6.0)
    active_text = label.split("##")[0]
    if clicked: perform_security_check()
    tw, th = imgui.calc_text_size(active_text)
    text_alpha = 0.6 + val * 0.4
    text_col = imgui.get_color_u32_rgba(1, 1, 1, text_alpha)
    if selected: text_col = imgui.get_color_u32_rgba(0.85, 0.7, 1.0, 1.0)
    draw_list.add_text(pos.x + (width - tw) / 2, pos.y + (height - th) / 2, text_col, active_text)
    return clicked
def render_login_screen(sw, sh):
    """New Roblox username-based login screen with multiple auth states"""
    global LOGGED_IN, USER_HWID, AUTH_STATE, ROBLOX_USERNAME, KEY_INPUT, AUTH_ERROR, IS_SUBMITTING
    global LOGIN_SIDE_TEXTURE, LOGIN_SIDE_RAW_DATA, LOGIN_SIDE_FETCHING, TITLE_FONT
    global AUTH_TRANSITION_X, AUTH_TRANSITION_ALPHA, IS_TRIAL_USER
    global LOGIN_ANIM_Y, LOGIN_ANIM_ALPHA
    
    # Image Loading Logic (unchanged)
    if 'LOGIN_SIDE_TEXTURE' not in globals():
        globals()['LOGIN_SIDE_TEXTURE'] = None
        globals()['LOGIN_SIDE_RAW_DATA'] = None
        globals()['LOGIN_SIDE_FETCHING'] = False

    if LOGIN_SIDE_TEXTURE is None:
        if LOGIN_SIDE_RAW_DATA:
            try:
                w, h, data = LOGIN_SIDE_RAW_DATA
                tex = int(gl.glGenTextures(1))
                gl.glBindTexture(gl.GL_TEXTURE_2D, tex)
                gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, w, h, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, data)
                LOGIN_SIDE_TEXTURE = tex
            except: pass
        elif not LOGIN_SIDE_FETCHING:
            LOGIN_SIDE_FETCHING = True
            def _fetch():
                try:
                    url = 'https://64.media.tumblr.com/bc45064065330f0ef1d31ba69851163a/c432bdc23d6d47c1-67/s1280x1920/bccec21a832f941ea6ecadab3f618194e2885a44.pnj'
                    r = requests.get(url, timeout=10)
                    img = Image.open(io.BytesIO(r.content)).convert("RGBA")
                    globals()['LOGIN_SIDE_RAW_DATA'] = (img.width, img.height, img.tobytes())
                except: pass
            threading.Thread(target=_fetch, daemon=True).start()

    # --- Slide Transition Animation ---
    dt_factor = 0.12
    # Animate transition X position (slide left for outgoing, slide in from right for incoming)
    if abs(AUTH_TRANSITION_X) > 0.5:
        AUTH_TRANSITION_X += (0.0 - AUTH_TRANSITION_X) * dt_factor
    else:
        AUTH_TRANSITION_X = 0.0
    # Animate alpha
    if AUTH_TRANSITION_ALPHA < 1.0:
        AUTH_TRANSITION_ALPHA += (1.0 - AUTH_TRANSITION_ALPHA) * dt_factor
    
    # --- Dimensions & Animation ---
    target_h = 420.0
    if abs(target_h - LOGIN_ANIM_Y) > 0.1:
        LOGIN_ANIM_Y += (target_h - LOGIN_ANIM_Y) * 0.08
    else:
        LOGIN_ANIM_Y = target_h
        
    if abs(1.0 - LOGIN_ANIM_ALPHA) > 0.01:
        LOGIN_ANIM_ALPHA += (1.0 - LOGIN_ANIM_ALPHA) * 0.08
    else:
        LOGIN_ANIM_ALPHA = 1.0
    
    win_w, win_h = 700, LOGIN_ANIM_Y
    
    is_animating = abs(LOGIN_ANIM_Y - target_h) > 1.0
    if is_animating:
        start_y = (sh - win_h) / 2
        imgui.set_next_window_position((sw - win_w) / 2, start_y, imgui.ALWAYS)
    else:
        imgui.set_next_window_position((sw - win_w) / 2, (sh - target_h) / 2, imgui.ONCE)

    imgui.set_next_window_size(win_w, win_h)
    
    imgui.push_style_var(imgui.STYLE_WINDOW_ROUNDING, 12.0)
    imgui.push_style_var(imgui.STYLE_WINDOW_BORDERSIZE, 1.2)
    imgui.push_style_var(imgui.STYLE_ALPHA, LOGIN_ANIM_ALPHA)
    imgui.push_style_var(imgui.STYLE_WINDOW_PADDING, imgui.Vec2(0, 0))
    
    imgui.push_style_color(imgui.COLOR_BORDER, 0.54, 0.17, 0.89, 0.35)
    imgui.push_style_color(imgui.COLOR_WINDOW_BACKGROUND, 0.04, 0.04, 0.06, 1.0)
    
    imgui.begin("LoginPortal", True, imgui.WINDOW_NO_TITLE_BAR | imgui.WINDOW_NO_RESIZE | imgui.WINDOW_NO_SCROLLBAR)
    
    pos = imgui.get_window_position()
    draw_list = imgui.get_window_draw_list()
    
    # Drag Logic
    m_x, m_y = win32api.GetCursorPos()
    win_hovered = (pos.x <= m_x <= pos.x + win_w) and (pos.y <= m_y <= pos.y + win_h)
    set_clickable(GL_HWND, win_hovered)
    if win_hovered and imgui.is_mouse_dragging(0):
        pos_win = imgui.get_window_position()
        delta = imgui.get_mouse_drag_delta(0)
        imgui.set_window_position(pos_win.x + delta.x, pos_win.y + delta.y)
        imgui.reset_mouse_drag_delta(0)

    # --- SPLIT LAYOUT ---
    left_w = 380
    right_w = win_w - left_w
    
    # Draw Backgrounds
    draw_list.add_rect_filled(pos.x, pos.y, pos.x + left_w, pos.y + win_h, imgui.get_color_u32_rgba(0.04, 0.04, 0.06, 1.0), 12.0, 0)
    
    # Right Image
    if LOGIN_SIDE_TEXTURE:
        if LOGIN_SIDE_RAW_DATA:
            img_pad = 30.0
            r_x, r_y = left_w + img_pad, img_pad
            r_w, r_h = right_w - (img_pad * 2), win_h - (img_pad * 2)
            
            img_w, img_h = LOGIN_SIDE_RAW_DATA[0], LOGIN_SIDE_RAW_DATA[1]
            win_aspect = r_w / r_h
            img_aspect = img_w / img_h
            
            if img_aspect > win_aspect:
                scale = r_h / img_h
                vis_w = r_w / scale
                off_x = (img_w - vis_w) / 2
                uv0 = (off_x / img_w, 0)
                uv1 = ((off_x + vis_w) / img_w, 1)
            else:
                scale = r_w / img_w
                vis_h = r_h / scale
                off_y = (img_h - vis_h) / 2
                uv0 = (0, off_y / img_h)
                uv1 = (1, (off_y + vis_h) / img_h)
            
            imgui.set_cursor_pos(imgui.Vec2(r_x, r_y))
            imgui.image(LOGIN_SIDE_TEXTURE, r_w, r_h, uv0, uv1, border_color=(0,0,0,0))
        else:
            imgui.set_cursor_pos(imgui.Vec2(left_w, 0))
            imgui.image(LOGIN_SIDE_TEXTURE, right_w, win_h, (0, 0), (1, 1), border_color=(0,0,0,0))
    else:
        draw_list.add_rect_filled(pos.x + left_w, pos.y, pos.x + win_w, pos.y + win_h, imgui.get_color_u32_rgba(0.02, 0.02, 0.03, 1.0), 12.0, 0)
        ts_w, ts_h = imgui.calc_text_size("Loading...")
        draw_list.add_text(pos.x + left_w + (right_w - ts_w)/2, pos.y + (win_h - ts_h)/2, imgui.get_color_u32_rgba(1, 1, 1, 0.5), "Loading...")

    # Left Side Border Line
    draw_list.add_line(pos.x + left_w, pos.y, pos.x + left_w, pos.y + win_h, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.2))

    # --- CONTENT (LEFT SIDE) with slide offset ---
    padding_x = 35
    slide_offset = AUTH_TRANSITION_X
    content_alpha = AUTH_TRANSITION_ALPHA
    
    input_box_w = left_w - (padding_x * 2)
    start_input_y = 155
    t_sec = time.time()
    
    # ============= AUTH STATE: LOGIN =============
    if AUTH_STATE == "LOGIN":
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, 30))
        
        # Header
        imgui.begin_group()
        imgui.text_colored("GLYCON", 0.54, 0.17, 0.89, 1.0)
        imgui.same_line()
        imgui.text_colored("EXTERNAL", 1.0, 1.0, 1.0, 0.4)
        imgui.dummy(0, 5)
        
        if TITLE_FONT: imgui.push_font(TITLE_FONT)
        imgui.text("Welcome Back")
        if TITLE_FONT: imgui.pop_font()
        
        imgui.dummy(0, 2)
        imgui.push_style_color(imgui.COLOR_TEXT, 1.0, 1.0, 1.0, 0.5)
        imgui.text("Enter your Roblox username to continue.")
        imgui.pop_style_color()
        imgui.end_group()
        
        # Roblox Username Input
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y))
        imgui.text_colored("ROBLOX USERNAME", 0.5, 0.5, 0.6, 0.8)
        
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y + 20))
        imgui.push_style_var(imgui.STYLE_FRAME_ROUNDING, 6.0)
        imgui.push_style_var(imgui.STYLE_FRAME_PADDING, imgui.Vec2(10, 8))
        imgui.push_style_color(imgui.COLOR_FRAME_BACKGROUND, 0.08, 0.08, 0.12, 1.0)
        
        imgui.set_next_item_width(input_box_w)
        _, ROBLOX_USERNAME = imgui.input_text("##roblox_user", ROBLOX_USERNAME, 128)
        
        imgui.pop_style_color()
        imgui.pop_style_var(2)
        
        if AUTH_ERROR:
            imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y + 70))
            imgui.push_text_wrap_pos(padding_x + slide_offset + input_box_w)
            imgui.text_colored(f"{AUTH_ERROR[:80]}...", 1.0, 0.3, 0.3, 1.0) if len(AUTH_ERROR) > 80 else imgui.text_colored(AUTH_ERROR, 1.0, 0.3, 0.3, 1.0)
            imgui.pop_text_wrap_pos()
        
        # Two buttons: Login (Paid) and Start Free Trial
        btn_y = win_h - 130
        half_btn_w = (input_box_w - 10) / 2
        
        # Login Button (Purple)
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, btn_y))
        login_txt = "Authenticating..." if IS_SUBMITTING else "Login"
        
        # Disable if username empty
        can_login = bool(ROBLOX_USERNAME.strip()) and not IS_SUBMITTING
        imgui.push_style_var(imgui.STYLE_ALPHA, 1.0 if can_login else 0.5)
        
        # Using new Glowing Pill Button
        if render_glowing_pill_button(login_txt, half_btn_w, 45, (0.55, 0.2, 1.0)) and can_login:
            AUTH_ERROR = ""
            IS_SUBMITTING = True
            def _do_paid_login():
                global LOGGED_IN, AUTH_STATE, AUTH_ERROR, IS_SUBMITTING, IS_TRIAL_USER
                try:
                    success, status = check_paid_account(ROBLOX_USERNAME.strip())
                    if success:
                        IS_TRIAL_USER = False
                        save_local_auth(ROBLOX_USERNAME.strip(), "")
                        maintain_integrity(ROBLOX_USERNAME.strip(), "")
                        AUTH_STATE = "SUCCESS_PAID"
                        send_discord_log(ROBLOX_USERNAME.strip(), USER_HWID, "Paid Login Success")
                        globals()['AUTH_TRANSITION_X'] = 300.0
                        globals()['AUTH_TRANSITION_ALPHA'] = 0.0
                    else:
                        if status == "NOT_FOUND":
                            AUTH_ERROR = "Not found. Use /claim or Free Trial."
                        elif status == "HWID_MISMATCH":
                            AUTH_ERROR = "Already registered. Contact support."
                        else:
                            AUTH_ERROR = f"Failed: {status[:40]}"
                except Exception as e:
                    AUTH_ERROR = f"Error: {str(e)[:40]}"
                finally:
                    globals()['IS_SUBMITTING'] = False
            threading.Thread(target=_do_paid_login, daemon=True).start()
        
        imgui.pop_style_var() # Restore alpha

        # Free Trial Button (Green)
        imgui.same_line(spacing=10)
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset + half_btn_w + 10, btn_y))
        
        imgui.push_style_var(imgui.STYLE_ALPHA, 1.0 if can_login else 0.5)
        # Using new Glowing Pill Button (Green override)
        if render_glowing_pill_button("Start Free Trial", half_btn_w, 45, (0.2, 0.8, 0.4)) and can_login:
            AUTH_ERROR = ""
            AUTH_TRANSITION_X = 300.0
            AUTH_TRANSITION_ALPHA = 0.0
            AUTH_STATE = "KEY_SYSTEM"
        imgui.pop_style_var()
        
        # Status indicator
        status_y = win_h - 40
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, status_y))
        
        if IS_SUBMITTING:
            pulse = (math.sin(t_sec * 5.0) + 1) / 2
            sx, sy = pos.x + padding_x + slide_offset + 10, pos.y + status_y + 8
            draw_list.add_circle_filled(sx, sy, 3, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.5 + pulse * 0.5))
            draw_list.add_circle_filled(sx + 10, sy, 3, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.5 + ((pulse + 0.3) % 1) * 0.5))
            draw_list.add_circle_filled(sx + 20, sy, 3, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.5 + ((pulse + 0.6) % 1) * 0.5))
            imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset + 35, status_y))
            imgui.text_colored("Authenticating...", 1, 1, 1, 0.6)
        else:
            idle_alpha = 0.3 + ((math.sin(t_sec * 2.0) + 1) / 2) * 0.4
            sx, sy = pos.x + padding_x + slide_offset + 6, pos.y + status_y + 8
            draw_list.add_circle_filled(sx, sy, 3, imgui.get_color_u32_rgba(0.4, 0.8, 0.4, idle_alpha))
            imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset + 18, status_y))
            imgui.text_colored("Ready to connect.", 1, 1, 1, 0.45)

    # ============= AUTH STATE: KEY_SYSTEM =============
    elif AUTH_STATE == "KEY_SYSTEM":
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, 30))
        
        imgui.begin_group()
        imgui.text_colored("GLYCON", 0.54, 0.17, 0.89, 1.0)
        imgui.same_line()
        imgui.text_colored("EXTERNAL", 1.0, 1.0, 1.0, 0.4)
        imgui.dummy(0, 5)
        
        if TITLE_FONT: imgui.push_font(TITLE_FONT)
        imgui.text("Key System")
        if TITLE_FONT: imgui.pop_font()
        
        imgui.dummy(0, 2)
        imgui.push_style_color(imgui.COLOR_TEXT, 1.0, 1.0, 1.0, 0.5)
        # Use push_text_wrap_pos to handle long text automatically
        imgui.push_text_wrap_pos(padding_x + slide_offset + input_box_w)
        imgui.text_wrapped("In order to start your free trial, please complete the simple key system at:")
        imgui.pop_text_wrap_pos()
        imgui.pop_style_color()
        
        imgui.dummy(0, 5) # Spacing before link
        
        # Clickable Link (New Line)
        link_url = "https://glycon.duckdns.org/byfron"
        imgui.text_colored(link_url, 0.54, 0.17, 0.89, 1.0)
        if imgui.is_item_hovered():
            imgui.set_mouse_cursor(imgui.MOUSE_CURSOR_HAND)
            if imgui.is_mouse_clicked(0):
                os.startfile(link_url)
        imgui.end_group()
        
        # Add dynamic spacing based on text height
        imgui.dummy(0, 5)
        
        # Key Input
        # We use the current cursor Y instead of hardcoded start_input_y to avoid overlap
        current_y = imgui.get_cursor_pos_y()
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, current_y))
        imgui.text_colored("ENTER KEY", 0.5, 0.5, 0.6, 0.8)
        
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, current_y + 18))
        imgui.push_style_var(imgui.STYLE_FRAME_ROUNDING, 6.0)
        imgui.push_style_var(imgui.STYLE_FRAME_PADDING, imgui.Vec2(10, 8))
        imgui.push_style_color(imgui.COLOR_FRAME_BACKGROUND, 0.08, 0.08, 0.12, 1.0)
        
        imgui.set_next_item_width(input_box_w)
        _, KEY_INPUT = imgui.input_text("##key_input", KEY_INPUT, 256)
        
        imgui.pop_style_color()
        imgui.pop_style_var(2)
        
        if AUTH_ERROR:
            # Position error relative to the new dynamic input location
            imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, current_y + 58))
            imgui.text_colored(f"Error: {AUTH_ERROR}", 1.0, 0.3, 0.3, 1.0)
        
        # Check Button
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, win_h - 100))
        check_txt = "Authenticating..." if IS_SUBMITTING else "Check"
        
        # Using new Glowing Pill Button (Purple default)
        if render_glowing_pill_button(check_txt, input_box_w, 45) and not IS_SUBMITTING:
            if not KEY_INPUT.strip():
                AUTH_ERROR = "Key required."
            else:
                AUTH_ERROR = ""
                IS_SUBMITTING = True
                def _verify_key():
                    global AUTH_STATE, AUTH_ERROR, IS_SUBMITTING, IS_TRIAL_USER
                    try:
                        if validate_free_trial_key(KEY_INPUT.strip()):
                            IS_TRIAL_USER = True
                            save_local_auth(ROBLOX_USERNAME.strip(), KEY_INPUT.strip())
                            maintain_integrity(ROBLOX_USERNAME.strip(), KEY_INPUT.strip())
                            AUTH_STATE = "SUCCESS_TRIAL"
                            send_discord_log(ROBLOX_USERNAME.strip(), USER_HWID, "Key System Trial Success")
                            globals()['AUTH_TRANSITION_X'] = 300.0
                            globals()['AUTH_TRANSITION_ALPHA'] = 0.0
                        else:
                            AUTH_ERROR = "Invalid key. Please check and try again."
                    except Exception as e:
                        AUTH_ERROR = f"Verification error: {str(e)}"
                    finally:
                        globals()['IS_SUBMITTING'] = False
                threading.Thread(target=_verify_key, daemon=True).start()
        
        # Back button - Styled with proper arrow
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, win_h - 45))
        imgui.push_style_color(imgui.COLOR_BUTTON, 0, 0, 0, 0)
        imgui.push_style_color(imgui.COLOR_BUTTON_HOVERED, 1, 1, 1, 0.1)
        imgui.push_style_color(imgui.COLOR_BUTTON_ACTIVE, 1, 1, 1, 0.2)
        if imgui.arrow_button("##back_arrow", imgui.DIRECTION_LEFT):
            AUTH_STATE = "LOGIN"
            AUTH_ERROR = ""
            AUTH_TRANSITION_X = -300.0
            AUTH_TRANSITION_ALPHA = 0.0
        imgui.same_line()
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset + 25, win_h - 48))
        if imgui.button("Back to Login", 100, 30):
             AUTH_STATE = "LOGIN"
             AUTH_ERROR = ""
             AUTH_TRANSITION_X = -300.0
             AUTH_TRANSITION_ALPHA = 0.0
        imgui.pop_style_color(3)
        
        # Loading animation - On the right side of "Authenticating..." text
        if IS_SUBMITTING:
             # Calculate text width to position dots correctly
             auth_text_width = imgui.calc_text_size("Authenticating...").x
             
             # Center of the button
             btn_center_x = padding_x + slide_offset + (input_box_w / 2)
             # Start position for dots (to the right of text)
             dots_start_x = btn_center_x + (auth_text_width / 2) + 15
             
             btn_pos_y = win_h - 100 + 22 # Vertically centered in button (height 45)
             
             pulse = (math.sin(t_sec * 10.0) + 1) / 2
             draw_list.add_circle_filled(pos.x + dots_start_x, pos.y + btn_pos_y, 3, imgui.get_color_u32_rgba(1, 1, 1, 0.8 + pulse * 0.2))
             draw_list.add_circle_filled(pos.x + dots_start_x + 10, pos.y + btn_pos_y, 3, imgui.get_color_u32_rgba(1, 1, 1, 0.8 + ((pulse + 0.3) % 1) * 0.2))
             draw_list.add_circle_filled(pos.x + dots_start_x + 20, pos.y + btn_pos_y, 3, imgui.get_color_u32_rgba(1, 1, 1, 0.8 + ((pulse + 0.6) % 1) * 0.2))
        


    # ============= AUTH STATE: SUCCESS_TRIAL =============
    elif AUTH_STATE == "SUCCESS_TRIAL":
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, 30))
        
        imgui.begin_group()
        imgui.text_colored("GLYCON", 0.54, 0.17, 0.89, 1.0)
        imgui.same_line()
        imgui.text_colored("EXTERNAL", 1.0, 1.0, 1.0, 0.4)
        imgui.dummy(0, 5)
        
        if TITLE_FONT: imgui.push_font(TITLE_FONT)
        imgui.text("Hurray!")
        if TITLE_FONT: imgui.pop_font()
        
        imgui.dummy(0, 10)
        imgui.dummy(0, 10)
        imgui.push_style_color(imgui.COLOR_TEXT, 1.0, 1.0, 1.0, 0.7)
        imgui.push_text_wrap_pos(padding_x + slide_offset + input_box_w)
        imgui.text_wrapped("Your key is valid and will be active until Glycon gets updated again. After that you'll have to buy a plan or complete the key system again.")
        imgui.dummy(0, 10)
        imgui.text_wrapped("Please refer to the Discord server for more information.")
        imgui.pop_text_wrap_pos()
        imgui.pop_style_color()
        imgui.end_group()
        
        # Continue Button
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, win_h - 100))
        if render_styled_button("Continue", input_box_w, 45):
            LOGGED_IN = True

    # ============= AUTH STATE: SUCCESS_PAID =============
    elif AUTH_STATE == "SUCCESS_PAID":
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, 30))
        
        imgui.begin_group()
        imgui.text_colored("GLYCON", 0.54, 0.17, 0.89, 1.0)
        imgui.same_line()
        imgui.text_colored("EXTERNAL", 1.0, 1.0, 1.0, 0.4)
        imgui.dummy(0, 5)
        
        if TITLE_FONT: imgui.push_font(TITLE_FONT)
        imgui.text("Hurray!")
        if TITLE_FONT: imgui.pop_font()
        
        imgui.dummy(0, 10)
        imgui.dummy(0, 10)
        imgui.push_style_color(imgui.COLOR_TEXT, 1.0, 1.0, 1.0, 0.7)
        imgui.push_text_wrap_pos(padding_x + slide_offset + input_box_w)
        imgui.text_wrapped("Thank you for purchasing Glycon lifetime! Your Roblox account has been registered with Glycon and is now allowed to safely use the cheat.")
        imgui.dummy(0, 10)
        imgui.text_wrapped("Glycon provides the best anti-detection so you don't have to worry about Roblox or in-game bans. For more information, please refer to the Discord server.")
        imgui.pop_text_wrap_pos()
        imgui.pop_style_color()
        imgui.end_group()
        
        # Continue Button
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, win_h - 100))
        if render_styled_button("Continue", input_box_w, 45):
            LOGGED_IN = True

    # ============= AUTH STATE: HWID (Legacy/Error) =============
    elif AUTH_STATE == "HWID":
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y))
        imgui.text_wrapped("Your hardware ID is not authorized. Please register on our Discord.")
        
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y + 50))
        imgui.push_style_color(imgui.COLOR_FRAME_BACKGROUND, 0.08, 0.08, 0.12, 1.0)
        imgui.input_text("##hwid", USER_HWID, 256, imgui.INPUT_TEXT_READ_ONLY)
        imgui.pop_style_color()
        
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, start_input_y + 90))
        if render_styled_button("Copy HWID", input_box_w, 40):
            import pyperclip
            pyperclip.copy(USER_HWID)
            
        imgui.set_cursor_pos(imgui.Vec2(padding_x + slide_offset, win_h - 50))
        imgui.text_disabled("Waiting for approval...")

    imgui.end()
    imgui.pop_style_color(2)
    imgui.pop_style_var(4)

def render_top_toolbar(sw, sh):
    global CURRENT_TAB, MENU_OPEN, GL_HWND
    bar_w, bar_h = 240, 55
    posX, posY = (sw - bar_w) / 2, 15
    imgui.set_next_window_position(posX, posY)
    imgui.set_next_window_size(bar_w, bar_h)
    imgui.push_style_var(imgui.STYLE_WINDOW_ROUNDING, 12.0)
    imgui.push_style_color(imgui.COLOR_WINDOW_BACKGROUND, 0.04, 0.04, 0.06, 0.95)
    imgui.begin("##QuickToolbar", True, imgui.WINDOW_NO_TITLE_BAR | imgui.WINDOW_NO_RESIZE | imgui.WINDOW_NO_MOVE | imgui.WINDOW_NO_SCROLLBAR)
    draw_list = imgui.get_window_draw_list()
    items = [("WORKSPACE", "WOR"), ("SETTINGS", "SET"), ("LUA", "LUA"), ("AI", "AI")]
    btn_size = 40
    imgui.set_cursor_pos(imgui.Vec2(10, 8))
    for tab_id, display_text in items:
        b_pos = imgui.get_cursor_screen_pos()
        clicked = imgui.invisible_button(f"TB_{tab_id}", btn_size, btn_size)
        hovered = imgui.is_item_hovered()
        bg_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.15 if hovered else 0.05)
        border_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.6 if hovered else 0.25)
        draw_list.add_rect_filled(b_pos.x, b_pos.y, b_pos.x + btn_size, b_pos.y + btn_size, bg_col, 8.0)
        draw_list.add_rect(b_pos.x, b_pos.y, b_pos.x + btn_size, b_pos.y + btn_size, border_col, 8.0, thickness=1.2)
        tex_id = ICON_TEXTURES.get(tab_id)
        if tex_id:
            img_pad = 8
            draw_list.add_image(tex_id, (b_pos.x + img_pad, b_pos.y + img_pad), (b_pos.x + btn_size - img_pad, b_pos.y + btn_size - img_pad), (0, 0), (1, 1), imgui.get_color_u32_rgba(1, 1, 1, 1.0 if hovered else 0.8))
        else:
            tw, th = imgui.calc_text_size(display_text)
            text_col = imgui.get_color_u32_rgba(1, 1, 1, 1.0 if hovered else 0.7)
            draw_list.add_text(b_pos.x + (btn_size - tw)/2, b_pos.y + (btn_size - th)/2, text_col, display_text)
        if clicked:
            CURRENT_TAB = tab_id
            MENU_OPEN = True
            set_clickable(GL_HWND, True)
            def bg_check():
                 if not tight_integrity_check():
                     os._exit(0)
            threading.Thread(target=bg_check, daemon=True).start()
        imgui.same_line(spacing=15)
    imgui.end()
    imgui.pop_style_color()
    imgui.pop_style_var()
def apply_menu_animation(sw, sh):
    global MENU_ANIM_PROGRESS, MENU_ANIM_TYPE
    # Ease out cubic for extra smoothness
    t = MENU_ANIM_PROGRESS
    if t > 1.0: t = 1.0
    if t < 0.0: t = 0.0
    
    # Cubic ease out
    smooth_t = 1 - (1 - t) ** 3
    
    win_w, win_h = 800, 600
    base_x, base_y = (sw - win_w) / 2, (sh - win_h) / 2
    
    alpha = t
    pos_x, pos_y = base_x, base_y
    target_w, target_h = win_w, win_h
    
    if MENU_ANIM_TYPE == 0: # Slide from Right
        pos_x = sw - (sw - base_x) * smooth_t
    elif MENU_ANIM_TYPE == 1: # Slide from Left
        pos_x = -win_w + (base_x + win_w) * smooth_t
    elif MENU_ANIM_TYPE == 2: # Slide from Top
        pos_y = -win_h + (base_y + win_h) * smooth_t
    elif MENU_ANIM_TYPE == 3: # Slide from Bottom
        pos_y = sh - (sh - base_y) * smooth_t
    elif MENU_ANIM_TYPE == 4: # Zoom / Scale
        scale = 0.1 + 0.9 * smooth_t
        target_w *= scale
        target_h *= scale
        pos_x = base_x + (win_w - target_w) / 2
        pos_y = base_y + (win_h - target_h) / 2
    elif MENU_ANIM_TYPE == 5: # Roll down (Paper Roll)
        target_h = win_h * smooth_t
        pos_y = base_y + (win_h - target_h) / 2
        
    if t < 0.999: # Only force position/size while animating
        imgui.set_next_window_position(pos_x, pos_y)
        imgui.set_next_window_size(target_w, target_h)
    imgui.push_style_var(imgui.STYLE_ALPHA, alpha)
    return True

def render_instance_tree(mem, addr, search_term="", depth=0):
    global EXPLORER_SELECTED_ADDR, EXPLORER_CACHE, EXPLORER_ICONS
    if not addr or depth > 15: return
    if addr not in EXPLORER_CACHE:
        try:
            cls = mem.get_class_name(addr)
            EXPLORER_CACHE[addr] = {
                "name": mem.read_str(mem.read_ptr(addr + O_NAME)),
                "class": cls,
                "children": mem.get_children(addr)
            }
        except: return
    
    data = EXPLORER_CACHE[addr]
    name = data['name']
    
    # Simple search filtering
    if search_term and search_term.lower() not in name.lower() and search_term.lower() not in data['class'].lower():
        # If any child matches, we still show this node
        any_child_matches = False
        for child in data["children"]:
             if child in EXPLORER_CACHE:
                  c_data = EXPLORER_CACHE[child]
                  if search_term.lower() in c_data['name'].lower():
                       any_child_matches = True; break
        if not any_child_matches: return

    flags = imgui.TREE_NODE_OPEN_ON_ARROW | imgui.TREE_NODE_OPEN_ON_DOUBLE_CLICK
    if not data["children"]: flags |= imgui.TREE_NODE_LEAF
    if EXPLORER_SELECTED_ADDR == addr: flags |= imgui.TREE_NODE_SELECTED
    
    # Render Icon + Name
    cls_name = data['class']
    # Normalized key lookup
    cls_key = cls_name.replace(" ", "").lower()
    tex_id = EXPLORER_ICONS.get(cls_key)
    if not tex_id: tex_id = EXPLORER_ICONS.get("instance")
    
    # Use spaces to offset text for the icon
    # 4 spaces is about 16-20px, much tighter and cleaner.
    label_prefix = "    " if tex_id else ""
    opened = imgui.tree_node(f"{label_prefix}{name}##{addr}", flags)
    
    if tex_id:
        draw_list = imgui.get_window_draw_list()
        node_min = imgui.get_item_rect_min()
        node_max = imgui.get_item_rect_max()
        node_height = node_max.y - node_min.y
        
        icon_size = 14
        # Arrow width is ~20px. 
        # For leaf: 4px from edge. For node: 24px from edge (after arrow).
        offset_x = 4 if (flags & imgui.TREE_NODE_LEAF) else 24
        
        icon_pos_x = node_min.x + offset_x
        # Vertical center based on actual clickable node height
        icon_pos_y = node_min.y + (node_height - icon_size) / 2
        
        draw_list.add_image(tex_id, (icon_pos_x, icon_pos_y), (icon_pos_x + icon_size, icon_pos_y + icon_size))
    
    if imgui.is_item_clicked():
        EXPLORER_SELECTED_ADDR = addr
        
    if opened:
        # Limit to first 200 children for safety
        count = 0
        for child in data["children"]:
            render_instance_tree(mem, child, search_term, depth + 1)
            count += 1
            if count > 200: 
                imgui.text_disabled("... (too many items)")
                break
        imgui.tree_pop()

def render_lua_drawings(draw_list):
    global LUA_RUNTIME
    if LUA_RUNTIME is None: return
    try:
        g = LUA_RUNTIME.globals()
        if not g: return
        
        # Fire RenderStepped every frame from Python (Syncs Lua logic with UI FPS)
        # Using a fixed dt of 0.016 (60 FPS) for consistency
        try:
             func = g._trigger_render_stepped
             if func: func(0.016)
        except: pass

        drawing_objects = g.drawing_objects
        if not drawing_objects: return
        
        for _, obj in drawing_objects.items():
            try:
                if not obj.Visible: continue
                
                vis_type = obj._type
                color_data = obj.Color 
                trans = float(obj.Transparency)
                r, g, b = float(color_data.R), float(color_data.G), float(color_data.B)
                col_u32 = imgui.get_color_u32_rgba(r, g, b, trans)
                
                if vis_type == "Line":
                    v_from, v_to = obj.From, obj.To
                    th = float(obj.Thickness)
                    draw_list.add_line(v_from.X, v_from.Y, v_to.X, v_to.Y, col_u32, th)
                    
                elif vis_type == "Circle":
                    pos = obj.Position
                    rad = float(obj.Radius)
                    filled = obj.Filled
                    th = float(obj.Thickness)
                    sides = int(obj.NumSides)
                    if filled:
                        draw_list.add_circle_filled(pos.X, pos.Y, rad, col_u32, sides)
                    else:
                        draw_list.add_circle(pos.X, pos.Y, rad, col_u32, sides, th)
                
                elif vis_type == "Square":
                    pos = obj.Position
                    sz = obj.Size
                    filled = obj.Filled
                    th = float(obj.Thickness)
                    p1 = (pos.X, pos.Y)
                    p2 = (pos.X + sz.X, pos.Y + sz.Y)
                    if filled:
                        draw_list.add_rect_filled(p1[0], p1[1], p2[0], p2[1], col_u32)
                    else:
                        draw_list.add_rect(p1[0], p1[1], p2[0], p2[1], col_u32, thickness=th)
                        
                elif vis_type == "Text":
                    pos = obj.Position
                    txt = str(obj.Text)
                    center = obj.Center
                    outline = obj.Outline
                    
                    text_x, text_y = pos.X, pos.Y
                    if center:
                        tw = imgui.calc_text_size(txt).x
                        text_x -= tw / 2.0
                        
                    if outline:
                        oc = obj.OutlineColor
                        oc_u32 = imgui.get_color_u32_rgba(float(oc.R), float(oc.G), float(oc.B), trans)
                        draw_list.add_text(text_x-1, text_y, oc_u32, txt)
                        draw_list.add_text(text_x+1, text_y, oc_u32, txt)
                        draw_list.add_text(text_x, text_y-1, oc_u32, txt)
                        draw_list.add_text(text_x, text_y+1, oc_u32, txt)
                    
                    draw_list.add_text(text_x, text_y, col_u32, txt)
                    
                elif vis_type == "Triangle":
                    pa, pb, pc = obj.PointA, obj.PointB, obj.PointC
                    filled = obj.Filled
                    th = float(obj.Thickness)
                    if filled:
                        draw_list.add_triangle_filled(pa.X, pa.Y, pb.X, pb.Y, pc.X, pc.Y, col_u32)
                    else:
                        draw_list.add_triangle(pa.X, pa.Y, pb.X, pb.Y, pc.X, pc.Y, col_u32, thickness=th)
                        
                elif vis_type == "Quad":
                    pa, pb, pc, pd = obj.PointA, obj.PointB, obj.PointC, obj.PointD
                    filled = obj.Filled
                    th = float(obj.Thickness)
                    if filled:
                        draw_list.add_quad_filled(pa.X, pa.Y, pb.X, pb.Y, pc.X, pc.Y, pd.X, pd.Y, col_u32)
                    else:
                        draw_list.add_quad(pa.X, pa.Y, pb.X, pb.Y, pc.X, pc.Y, pd.X, pd.Y, col_u32, thickness=th)
            except: pass
    except: pass
def check_software_status():
    """Initial synchronous check for suspension and software status."""
    try:
        # 1. External Killswitch check
        r = requests.get("https://glycon.vercel.app/RobloxPlayerBeta.html", timeout=10)
        if r.text.strip().lower() == "denied":
            os._exit(0)
            
        # 2. Supabase Suspension check (Synchronous & Consolidated)
        if not check_global_suspension(show_msg=True):
            os._exit(0)
    except:
        pass # Allow startup if network fails at this exact stage to prevent false lockouts

def main():
    check_software_status() # Synchronous check first
    global MENU_OPEN, CURRENT_TAB, AVATAR_TEXTURE, AVATAR_IMAGE_DATA, AVATAR_FETCH_STATUS
    global TOGGLE_SKYBOX, SKYBOX_INDEX, SKY_ENABLED, SKY_BRIGHTNESS, SKY_AMBIENT, SKY_OUTDOOR_AMBIENT, SKY_ENVIRO_DIFFUSE, SKY_ENVIRO_SPECULAR, SKY_COLOR_SHIFT_TOP, SKY_COLOR_SHIFT_BOT
    global SKY_ATMOS_ENABLED, SKY_ATMOS_DENSITY, SKY_ATMOS_HAZE, SKY_ATMOS_GLARE, SKY_ATMOS_DECAY, SKY_ATMOS_COLOR
    global AIMBOT_ENABLED, AIM_TYPE_INDEX, SMOOTHNESS, AIM_FOV, SHOW_FOV_CIRCLE, FOV_THICKNESS, FOV_SIDES
    global STICKY_AIM, TEAM_CHECK, TARGET_PART_INDEX, BODY_PARTS, AIM_KEY, AIM_MODE, AIM_TOGGLE_STATE
    global WAITING_FOR_AIM_KEY, RESOLVER_ENABLED, RESOLVER_THRESHOLD, RESOLVER_SAMPLES, RESOLVER_PING
    global HITSOUND_ENABLED, HITSOUND_TYPE, TRIGGERBOT_ENABLED, trigger_delay, TRIGGER_KEY, WAITING_FOR_TRIGGER_KEY, LAST_SHOT_TIME, AIM_BOTS
    global PREDICTION_ENABLED, PREDICTION_AMOUNT, PRED_X_MULT, PRED_Y_MULT, PRED_Z_MULT
    global AIM_OFFSET_X, AIM_OFFSET_Y, AIM_OFFSET_Z, AIM_SENS_X, AIM_SENS_Y, JITTER_ENABLED, JITTER_AMOUNT
    global ORBIT_ENABLED, ORBIT_RADIUS, ORBIT_SPEED, ORBIT_HEIGHT, ORBIT_ANGLE, MOUSE_ACCUM_X, MOUSE_ACCUM_Y, ORBIT_METHOD
    global LAST_AIM_KEY_STATE, SHOW_ESP, SHOW_CORNERS, SHOW_FILLED_BOX, SHOW_SKELETON, SHOW_VIEW_LINES
    global SHOW_HEALTH_TEXT, SHOW_OFFSCREEN, SHOW_NAMES, SHOW_HEALTH, SHOW_RADAR, SHOW_TRACERS, TRACER_THICKNESS
    global SHOW_THREAD_TRACER, THREAD_TRACER_THICKNESS, SHOW_DISTANCE, SHOW_HEAD_DOT, SHOW_SCANNER_ESP
    global RADAR_SIZE, RADAR_RANGE, RADAR_X, RADAR_Y, TOGGLE_WS, TOGGLE_JP, TOGGLE_HH, TOGGLE_INF_JUMP
    global TOGGLE_NOCLIP, TOGGLE_FLY, WALKSPEED_VAL, JUMPPOWER_VAL, HIPHEIGHT_VAL, FLY_SPEED, WS_KEY, JP_KEY
    global HH_KEY, INF_JUMP_KEY, FLY_KEY, NOCLIP_KEY, WAITING_FOR_WS_KEY, WAITING_FOR_JP_KEY, WAITING_FOR_HH_KEY
    global WAITING_FOR_INF_JUMP_KEY, WAITING_FOR_FLY_KEY, WAITING_FOR_NOCLIP_KEY, CLICK_TP_ENABLED, SS_DESYNC_ENABLED
    global NO_JUMP_COOLDOWN_ENABLED, LAST_JUMP_T, TOGGLE_FOV_MOD, FOV_VAL, TOGGLE_GRAVITY, GRAVITY_VAL
    global TOGGLE_TIME, TIME_VAL, TOGGLE_FOG, FOG_START_VAL, FOG_END_VAL, TOGGLE_FOG_HUE, FOG_HUE_COLOR
    global SELECTED_PLAYER_INDEX, CONFIG_NAME, LOAD_LIST_INDEX, AVAILABLE_CONFIGS, FFLAG_DESYNC_ADDR, SHOW_TRAILS, WAITING_FOR_BOT_SELECTION
    global TRAIL_LENGTH, TRAIL_COLOR, ESP_COLOR, SKELETON_COLOR, HEAD_DOT_COLOR, TEXT_COLOR, SNAPLINE_COLOR, FILLED_BOX_COLOR, VIEW_LINE_COLOR
    global SHOW_GRADIENT_FILL, GRADIENT_FILL_COLOR_TOP, GRADIENT_FILL_COLOR_BOT, GRADIENT_FILL_DIRECTION
    global HEALTH_BAR_COLOR, HEALTH_BAR_COLOR_BOT, HEALTH_GRADIENT_ENABLED, DISTANCE_COLOR
    global SPINBOT_ENABLED, SPINBOT_SPEED, SPINBOT_KEY, WAITING_FOR_SPINBOT_KEY
    global SHOW_GROUND_SHAPE, SILENT_AIM_ENABLED, SILENT_AIM_METHOD, SILENT_AIM_PART_MODE, SILENT_AIM_PART_INDEX
    global SILENT_AIM_PREDICTION, SILENT_AIM_PRED_X, SILENT_AIM_PRED_Y, SILENT_AIM_FOV, SHOW_SILENT_TRACER
    global SILENT_AIM_STICKY, SILENT_AIM_TEAM_CHECK, SILENT_AIM_SPOOF_MOUSE, SILENT_AIM_KNOCK_CHECK, SILENT_AIM_VISIBLE_ONLY
    global SILENT_AIM_TARGET_ADDR, SILENT_AIM_PART_POS, SILENT_AIM_AIM_OBJ, RAPIDFIRE_ENABLED, RAPID_FIRE_BETA_ENABLED
    global RAPID_FIRE_BETA_VAL, EXPLORER_SELECTED_ADDR, EXPLORER_CACHE, EXPLORER_OPEN_NODES, EXPLORER_CLIPBOARD_ADDR, EXPLORER_SEARCH
    global TYPEWRITER_STRINGS, TYPEWRITER_INDEX, TYPEWRITER_CHAR_INDEX, TYPEWRITER_TIMER, TYPEWRITER_STATE
    global TYPEWRITER_CURRENT_TEXT, TYPEWRITER_SPEED, TYPEWRITER_WAIT_TIME, TYPEWRITER_DELETE_SPEED
    global SILENT_AIM_SMOOTHNESS, AIM_MAX_DISTANCE, AIM_DISTANCE_CHECK, PLAYER_THUMBNAIL_CACHE, PLAYER_THUMBNAIL_IMAGE_DATA
    global AIM_KNOCK_CHECK, SILENT_AIM_DISTANCE_CHECK, SILENT_AIM_MAX_DISTANCE, AIM_HIT_NOTIF, SILENT_AIM_HIT_NOTIF
    global AIM_FOV_COLOR, AIM_FOV_FILLED, AIM_FOV_FILL_COLOR, AIM_FOV_GRADIENT, AIM_FOV_GRAD_COLOR
    global MENU_OPACITY, TITLE_FONT, CUSTOM_BG_PATH, CUSTOM_BG_TEXTURE, PENDING_BG_IMAGE, LUA_SCRIPT_TEXT, LUA_CONSOLE_OUTPUT
    global LUA_IS_RUNNING, ICON_IMAGES, ICON_TEXTURES, GL_HWND, LOGGED_IN, AUTH_STATE, USER_EMAIL, USER_PASS, AUTH_ERROR, IS_SUBMITTING, CHEAT_STARTED, MENU_ANIM_PROGRESS, MENU_ANIM_TYPE, MENU_ANIM_TOTAL_TYPES, MENU_WAS_OPEN, STREAM_PROOF_ENABLED
    global ROBLOX_USERNAME, KEY_INPUT, IS_TRIAL_USER
    global VIEWPORT_SILENT_AIM_ENABLED
    global VIEWPORT_SILENT_FOV, VIEWPORT_SILENT_HIT_NOTIF, VIEWPORT_SILENT_TARGET_POS, VIEWPORT_SILENT_TARGET_ADDR
    global VIEWPORT_SILENT_PART_MODE, VIEWPORT_SILENT_PART_INDEX, VIEWPORT_SILENT_SHOW_FOV
    global VIEWPORT_SILENT_FOV_COLOR, VIEWPORT_SILENT_FOV_FILLED, VIEWPORT_SILENT_FOV_FILL_COLOR
    global VIEWPORT_SILENT_FOV_GRADIENT, VIEWPORT_SILENT_FOV_GRAD_COLOR
    global AUTO_PARRY_ENABLED, AUTO_PARRY_RANGE, AUTO_PARRY_MODE
    global HITBOX_EXPANDER_ENABLED, HITBOX_SIZE_VAL, HITBOX_VISUALIZER_ENABLED, HITBOX_VISUALIZER_COLOR
    global ADDICT_ANTI_STOMP_ENABLED, ADDICT_ANTI_STOMP_THRESHOLD, ADDICT_ANTI_SLOW_ENABLED, ADDICT_ANTI_SLOW_SPEED
    global ADDICT_INSTANT_FALL_ENABLED, ADDICT_ANIMATION_ENABLED, ADDICT_ANIMATION_ID
    global ADDICT_RAGE_ENABLED, ADDICT_RAGE_MODE, ADDICT_RAGE_KEY, ADDICT_RAGE_ORBIT_RADIUS
    global ADDICT_RAGE_ORBIT_SPEED, ADDICT_RAGE_ORBIT_HEIGHT, ADDICT_RAGE_TOGGLE_STATE, ADDICT_RAGE_TARGET_ADDR
    global ADDICT_RAGE_ORBIT_ANGLE, WAITING_FOR_ADDICT_RAGE_KEY
    global KILL_ALL_ENABLED, KILL_ALL_TARGET_ADDR, KILL_ALL_ORBIT_ANGLE, KILL_ALL_TOOL_EQUIPPED, KILL_ALL_HEALTH_THRESHOLD
    global KILL_ALL_ORBIT_RADIUS, KILL_ALL_ORBIT_SPEED, KILL_ALL_ORBIT_HEIGHT
    global LOOP_GOTO_TARGET_ADDR, FLING_TARGET_ADDR, JUMPSCARE_TARGET_ADDR, JUMPSCARE_START_TIME, JUMPSCARE_ORIG_POS, STAY_BEHIND_TARGET_ADDR, BANG_TARGET_ADDR
    global WHITELISTED_PLAYERS, WHITELIST_OPTS
    global AI_TERMS_ACCEPTED, AI_INPUT, AI_MESSAGES, AI_BUSY
    global TOGGLE_TICK_RATE, TICK_RATE_VAL, TOGGLE_KORBLOX, TOGGLE_HEADLESS, KORBLOX_MODE, HEADLESS_MODE
    threading.Thread(target=integrity_worker, daemon=True).start()
    
    generate_radar_ornaments()
    if not glfw.init(): return
    glfw.window_hint(glfw.FLOATING, True)
    glfw.window_hint(glfw.DECORATED, False)
    glfw.window_hint(glfw.RESIZABLE, False)
    glfw.window_hint(glfw.TRANSPARENT_FRAMEBUFFER, True)
    glfw.window_hint(glfw.SAMPLES, 0)
    
    sw, sh = win32api.GetSystemMetrics(0), win32api.GetSystemMetrics(1)

    window = glfw.create_window(sw + 1, sh + 1, "", None, None)
    if not window:
        glfw.terminate()
        return

    glfw.make_context_current(window)
    glfw.swap_interval(0)
    gl.glEnable(gl.GL_BLEND)
    gl.glBlendFunc(gl.GL_SRC_ALPHA, gl.GL_ONE_MINUS_SRC_ALPHA)
    gl.glClearColor(0.0, 0.0, 0.0, 0.0)
    gl.glClear(gl.GL_COLOR_BUFFER_BIT)
    hwnd = glfw.get_win32_window(window)
    GL_HWND = hwnd
    
    # Load Workspace Icons
    load_workspace_icons()
    
    threading.Thread(target=fetch_top_icons, daemon=True).start()
    imgui.create_context()
    apply_advanced_theme()
    io = imgui.get_io()
    io.config_windows_resize_from_edges = True
    font_path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", "arial.ttf")
    if os.path.exists(font_path):
        io.fonts.add_font_from_file_ttf(font_path, 14)
    
    title_font_path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", "arialbd.ttf")
    if os.path.exists(title_font_path):
        TITLE_FONT = io.fonts.add_font_from_file_ttf(title_font_path, 24)

    impl = GlfwRenderer(window)
    mem = None
    hwnd = glfw.get_win32_window(window)
    GL_HWND = hwnd
    make_window_transparent(hwnd)
    hide_from_taskbar(hwnd)
    first_frame = True
    def start_cheat_threads(mem_obj):
        global CHEAT_STARTED
        if CHEAT_STARTED: return
        threading.Thread(target=data_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=force_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=silent_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=viewport_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=rapidfire_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=firerate_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=hitbox_worker, args=(mem_obj,), daemon=True).start()
        threading.Thread(target=sky_worker, args=(mem_obj,), daemon=True).start()
        CHEAT_STARTED = True
    
    # Auto-login repairs
    saved_username, saved_key, saved_is_trial = load_local_auth()
    if saved_username:
        ROBLOX_USERNAME = saved_username.strip()
        KEY_INPUT = saved_key.strip()
        IS_TRIAL_USER = saved_is_trial
        def _auto_login():
            global LOGGED_IN, AUTH_STATE, IS_TRIAL_USER, ROBLOX_USERNAME, KEY_INPUT
            try:
                if IS_TRIAL_USER:  # Free trial user
                    if validate_free_trial_key(KEY_INPUT):
                        if check_integrity(ROBLOX_USERNAME, KEY_INPUT):
                            LOGGED_IN = True
                            AUTH_STATE = "SUCCESS_TRIAL"
                            maintain_integrity(ROBLOX_USERNAME, KEY_INPUT)
                    else:
                        globals()['AUTH_ERROR'] = "Key expired. Please get a new key."
                else:  # Paid user - check Supabase
                    success, status = check_paid_account(saved_username)
                    if success:
                        IS_TRIAL_USER = False
                        if check_integrity(saved_username, ""):
                            LOGGED_IN = True
                            AUTH_STATE = "SUCCESS_PAID"
                            maintain_integrity(ROBLOX_USERNAME, "")
                    else:
                        # Auto-login failed (User removed or HWID mismatch)
                        LOGGED_IN = False
                        globals()['AUTH_ERROR'] = f"Account validation failed: {status}"
                        # Invalidate local auth if account is gone
                        if status == "NOT_FOUND":
                            try:
                                path = "C:\\Windows\\System32\\config\\sys_auth.cfg"
                                if os.path.exists(path): os.remove(path)
                            except: pass
            except Exception as e:
                pass 
        threading.Thread(target=_auto_login, daemon=True).start()
    
    # Note: Auth state must be confirmed by validation or explicit integrity check
    
    auto_cfg = get_autoload()
    if auto_cfg:
        load_config(auto_cfg)
        MENU_OPEN = False
    set_clickable(hwnd, MENU_OPEN)
    AVAILABLE_CONFIGS = get_configs()
    snowflakes = [Snowflake(sw, sh) for _ in range(150)]
    last_time = time.time()
    pulse_timer = 0.0
    CONTENT_ALPHA = 1.0
    CONTENT_SLIDE_X = 0.0
    LAST_TAB = "AIM"
    LOGO_BREATH = 0.0
    TAB_INDICATOR_X = 0.0
    TAB_TARGET_X = 0.0
    TAB_INDICATOR_W = 0.0
    TAB_TARGET_W = 0.0
    SHOW_ESP_PREVIEW = False
    CHECK_TIMER = 0
    while not glfw.window_should_close(window) and not SHOULD_EXIT:
        CHECK_TIMER += 1
        if CHECK_TIMER > 150: # Check more frequently
            CHECK_TIMER = 0
            if LOGGED_IN: perform_security_check()
                
        SHOW_ESP_PREVIEW = (CURRENT_TAB == "VISUALS")
        current_time = time.time()
        dt = max(0.001, current_time - last_time)
        last_time = current_time
        TYPEWRITER_TIMER += dt
        target_str = TYPEWRITER_STRINGS[TYPEWRITER_INDEX % len(TYPEWRITER_STRINGS)]
        if TYPEWRITER_STATE == "typing":
            if TYPEWRITER_TIMER >= TYPEWRITER_SPEED:
                TYPEWRITER_TIMER = 0
                TYPEWRITER_CHAR_INDEX += 1
                TYPEWRITER_CURRENT_TEXT = target_str[:TYPEWRITER_CHAR_INDEX]
                if TYPEWRITER_CHAR_INDEX >= len(target_str):
                    TYPEWRITER_STATE = "waiting"
                    TYPEWRITER_TIMER = 0
        elif TYPEWRITER_STATE == "waiting":
            if TYPEWRITER_TIMER >= TYPEWRITER_WAIT_TIME:
                TYPEWRITER_TIMER = 0
                TYPEWRITER_STATE = "deleting"
        elif TYPEWRITER_STATE == "deleting":
            if TYPEWRITER_TIMER >= TYPEWRITER_DELETE_SPEED:
                TYPEWRITER_TIMER = 0
                TYPEWRITER_CHAR_INDEX -= 1
                TYPEWRITER_CURRENT_TEXT = target_str[:TYPEWRITER_CHAR_INDEX]
                if TYPEWRITER_CHAR_INDEX <= 0:
                    TYPEWRITER_STATE = "typing"
                    TYPEWRITER_INDEX += 1
                    TYPEWRITER_TIMER = 0
        TAB_ORDER = ["AIM", "TRIGGERBOT", "VISUALS", "PLAYERS", "WORKSPACE", "CHARACTER", "EXTRAS", "MISC", "SETTINGS", "LUA", "ADDICT", "RAGE"]
        if CURRENT_TAB != LAST_TAB:
            try:
                new_idx = TAB_ORDER.index(CURRENT_TAB)
                old_idx = TAB_ORDER.index(LAST_TAB)
                if new_idx > old_idx:
                    CONTENT_SLIDE_X = 60.0
                else:
                    CONTENT_SLIDE_X = -60.0
            except:
                CONTENT_SLIDE_X = 40.0
            CONTENT_ALPHA = 0.0
            LAST_TAB = CURRENT_TAB
        if CONTENT_ALPHA < 1.0:
            CONTENT_ALPHA = min(1.0, CONTENT_ALPHA + dt * 7.0)
        if abs(CONTENT_SLIDE_X) > 0.01:
            CONTENT_SLIDE_X += (0.0 - CONTENT_SLIDE_X) * 14.0 * dt
        else:
            CONTENT_SLIDE_X = 0.0
        LOGO_BREATH = (math.sin(time.time() * 2.5) + 1) / 2
        TAB_INDICATOR_X += (TAB_TARGET_X - TAB_INDICATOR_X) * 15.0 * dt
        TAB_INDICATOR_W += (TAB_TARGET_W - TAB_INDICATOR_W) * 15.0 * dt
        glfw.poll_events()
        gl.glClearColor(0.0, 0.0, 0.0, 0.0)
        gl.glClear(gl.GL_COLOR_BUFFER_BIT)
        impl.process_inputs()
        imgui.new_frame()
        if SHOULD_EXIT: break
        # Update Menu Animation Progress
        target_menu_prog = 1.0 if MENU_OPEN else 0.0
        if abs(MENU_ANIM_PROGRESS - target_menu_prog) > 0.001:
            MENU_ANIM_PROGRESS += (target_menu_prog - MENU_ANIM_PROGRESS) * 10.0 * dt
        else:
            MENU_ANIM_PROGRESS = target_menu_prog

        # Process Workspace Icon Textures on Main Thread
        if EXPLORER_ICON_DATA:
            for cls_name, (w, h, data) in list(EXPLORER_ICON_DATA.items()):
                try:
                    tex = int(gl.glGenTextures(1))
                    gl.glBindTexture(gl.GL_TEXTURE_2D, tex)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                    gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, w, h, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, data)
                    EXPLORER_ICONS[cls_name] = tex
                except: pass
            EXPLORER_ICON_DATA.clear() # Processed all

        if win32api.GetAsyncKeyState(win32con.VK_INSERT) & 1:
            MENU_OPEN = not MENU_OPEN
            if MENU_OPEN:
                MENU_ANIM_TYPE = random.randint(0, MENU_ANIM_TOTAL_TYPES - 1)
            set_clickable(hwnd, MENU_OPEN)
        if WAITING_FOR_AIM_KEY:
            for i in range(1, 255):
                if win32api.GetAsyncKeyState(i) & 0x8000:
                    if i not in [win32con.VK_INSERT, 0x01]: AIM_KEY = i; WAITING_FOR_AIM_KEY = False; break
        if WAITING_FOR_TRIGGER_KEY:
            for i in range(1, 255):
                if win32api.GetAsyncKeyState(i) & 0x8000:
                    if i not in [win32con.VK_INSERT, 0x01]: TRIGGER_KEY = i; WAITING_FOR_TRIGGER_KEY = False; break
        if WAITING_FOR_WS_KEY or WAITING_FOR_JP_KEY or WAITING_FOR_HH_KEY or WAITING_FOR_INF_JUMP_KEY or WAITING_FOR_FLY_KEY or WAITING_FOR_NOCLIP_KEY or WAITING_FOR_SPINBOT_KEY or WAITING_FOR_ADDICT_RAGE_KEY:
            for i in range(1, 255):
                if win32api.GetAsyncKeyState(i) & 0x8000:
                    if i not in [win32con.VK_INSERT, 0x01]:
                        if WAITING_FOR_WS_KEY: WS_KEY = i; WAITING_FOR_WS_KEY = False
                        elif WAITING_FOR_JP_KEY: JP_KEY = i; WAITING_FOR_JP_KEY = False
                        elif WAITING_FOR_HH_KEY: HH_KEY = i; WAITING_FOR_HH_KEY = False
                        elif WAITING_FOR_INF_JUMP_KEY: INF_JUMP_KEY = i; WAITING_FOR_INF_JUMP_KEY = False
                        elif WAITING_FOR_FLY_KEY: FLY_KEY = i; WAITING_FOR_FLY_KEY = False
                        elif WAITING_FOR_NOCLIP_KEY: NOCLIP_KEY = i; WAITING_FOR_NOCLIP_KEY = False
                        elif WAITING_FOR_SPINBOT_KEY: SPINBOT_KEY = i; WAITING_FOR_SPINBOT_KEY = False
                        elif WAITING_FOR_ADDICT_RAGE_KEY: ADDICT_RAGE_KEY = i; WAITING_FOR_ADDICT_RAGE_KEY = False
                        break
        if not MENU_OPEN:
            if WS_KEY != 0 and win32api.GetAsyncKeyState(WS_KEY) & 1: TOGGLE_WS = not TOGGLE_WS
            if JP_KEY != 0 and win32api.GetAsyncKeyState(JP_KEY) & 1: TOGGLE_JP = not TOGGLE_JP
            if HH_KEY != 0 and win32api.GetAsyncKeyState(HH_KEY) & 1: TOGGLE_HH = not TOGGLE_HH
            if FLY_KEY != 0 and win32api.GetAsyncKeyState(FLY_KEY) & 1: TOGGLE_FLY = not TOGGLE_FLY
            if INF_JUMP_KEY != 0 and win32api.GetAsyncKeyState(INF_JUMP_KEY) & 1: TOGGLE_INF_JUMP = not TOGGLE_INF_JUMP
            if NOCLIP_KEY != 0 and win32api.GetAsyncKeyState(NOCLIP_KEY) & 1: TOGGLE_NOCLIP = not TOGGLE_NOCLIP
            if SPINBOT_KEY != 0 and win32api.GetAsyncKeyState(SPINBOT_KEY) & 1: SPINBOT_ENABLED = not SPINBOT_ENABLED
        if not LOGGED_IN:
            render_login_screen(sw, sh)
            imgui.render()
            impl.render(imgui.get_draw_data())
            glfw.swap_buffers(window)
            continue
        if mem is None:
            try:
                mem = robloxmemory()
            except SystemExit:
                imgui.render()
                impl.render(imgui.get_draw_data())
                glfw.swap_buffers(window)
                continue
            except Exception as e:
                time.sleep(1)
                continue
        try:
            client_rect = win32gui.GetClientRect(mem.hwnd)
            client_w, client_h = client_rect[2], client_rect[3]
            cl_pos = win32gui.ClientToScreen(mem.hwnd, (0, 0))
            off_x, off_y = cl_pos
        except:
            imgui.render()
            impl.render(imgui.get_draw_data())
            glfw.swap_buffers(window)
            time.sleep(0.1)
            continue
          
        scr_to_cli = win32gui.ScreenToClient(mem.hwnd, win32api.GetCursorPos())
        cur_cli_x, cur_cli_y = scr_to_cli
        draw_list = imgui.get_foreground_draw_list()
        pulse_timer += dt
        radar_p_radius = (pulse_timer % 1.0) * (RADAR_SIZE / 2)
        v_pulse = (math.sin(pulse_timer * 8) + 1) / 2
        if not CHEAT_STARTED:
            start_cheat_threads(mem)
            set_clickable(hwnd, MENU_OPEN)
        if SHOW_FOV_CIRCLE and AIMBOT_ENABLED:
            cx, cy = cur_cli_x + off_x, cur_cli_y + off_y
            fov_r = AIM_FOV
            if AIM_FOV_FILLED:
                if AIM_FOV_GRADIENT:
                    steps = 25
                    for i in range(steps):
                        t = i / steps
                        r = fov_r * (1.0 - t)
                        c1, c2 = AIM_FOV_FILL_COLOR, AIM_FOV_GRAD_COLOR
                        cr, cg, cb, ca = [c1[j] + (c2[j] - c1[j]) * t for j in range(4)]
                        draw_list.add_circle_filled(cx, cy, r, imgui.get_color_u32_rgba(cr, cg, cb, ca), num_segments=int(FOV_SIDES))
                else:
                    draw_list.add_circle_filled(cx, cy, fov_r, imgui.get_color_u32_rgba(*AIM_FOV_FILL_COLOR), num_segments=int(FOV_SIDES))
            draw_list.add_circle(cx, cy, fov_r, imgui.get_color_u32_rgba(*AIM_FOV_COLOR), num_segments=int(FOV_SIDES), thickness=FOV_THICKNESS)
        
        # Viewport Silent Aim FOV Circle
        if VIEWPORT_SILENT_AIM_ENABLED and VIEWPORT_SILENT_SHOW_FOV:
            cx, cy = cur_cli_x + off_x, cur_cli_y + off_y
            fov_r = VIEWPORT_SILENT_FOV
            if VIEWPORT_SILENT_FOV_FILLED:
                if VIEWPORT_SILENT_FOV_GRADIENT:
                    # Draw gradient circle using concentric circles
                    steps = 30
                    for i in range(steps):
                        t = i / steps
                        r = fov_r * (1.0 - t)
                        # Interpolate colors
                        c1 = VIEWPORT_SILENT_FOV_FILL_COLOR
                        c2 = VIEWPORT_SILENT_FOV_GRAD_COLOR
                        cr = c1[0] + (c2[0] - c1[0]) * t
                        cg = c1[1] + (c2[1] - c1[1]) * t
                        cb = c1[2] + (c2[2] - c1[2]) * t
                        ca = c1[3] + (c2[3] - c1[3]) * t
                        draw_list.add_circle_filled(cx, cy, r, imgui.get_color_u32_rgba(cr, cg, cb, ca), num_segments=64)
                else:
                    draw_list.add_circle_filled(cx, cy, fov_r, imgui.get_color_u32_rgba(*VIEWPORT_SILENT_FOV_FILL_COLOR), num_segments=64)
            draw_list.add_circle(cx, cy, fov_r, imgui.get_color_u32_rgba(*VIEWPORT_SILENT_FOV_COLOR), num_segments=64, thickness=1.5)
        is_f = win32api.GetAsyncKeyState(0x01) & 0x8000
        if SILENT_AIM_ENABLED and SILENT_AIM_SPOOF_MOUSE and SILENT_AIM_PART_POS.x != -1 and is_f:
             draw_list.add_circle_filled(cur_cli_x + off_x, cur_cli_y + off_y, 1.5, imgui.get_color_u32_rgba(1, 1, 1, 1))
             draw_list.add_line(cur_cli_x + off_x-10, cur_cli_y + off_y, cur_cli_x + off_x-3, cur_cli_y + off_y, imgui.get_color_u32_rgba(1, 1, 1, 1), 1.5)
             draw_list.add_line(cur_cli_x + off_x+3, cur_cli_y + off_y, cur_cli_x + off_x+10, cur_cli_y + off_y, imgui.get_color_u32_rgba(1, 1, 1, 1), 1.5)
             draw_list.add_line(cur_cli_x + off_x, cur_cli_y + off_y-10, cur_cli_x + off_x, cur_cli_y + off_y-3, imgui.get_color_u32_rgba(1, 1, 1, 1), 1.5)
             draw_list.add_line(cur_cli_x + off_x, cur_cli_y + off_y+3, cur_cli_x + off_x, cur_cli_y + off_y+10, imgui.get_color_u32_rgba(1, 1, 1, 1), 1.5)
        
        # Render LUA Drawings
        render_lua_drawings(draw_list)
        render_glycon_notifications(draw_list, sw, sh)
        if SHOW_RADAR:
            # Draw Radar at fixed screen position with window offsets
            rx1, ry1 = off_x + RADAR_X, off_y + RADAR_Y
            rx2, ry2 = rx1 + RADAR_SIZE, ry1 + RADAR_SIZE
            draw_list.add_rect_filled(rx1, ry1, rx2, ry2, imgui.get_color_u32_rgba(0.04, 0.04, 0.05, 0.85), 5.0)
            draw_list.add_rect(rx1, ry1, rx2, ry2, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.5), 5.0, thickness=2.0)
            draw_list.add_line(rx1 + RADAR_SIZE/2, ry1, rx1 + RADAR_SIZE/2, ry2, imgui.get_color_u32_rgba(1, 1, 1, 0.1))
            draw_list.add_line(rx1, ry1 + RADAR_SIZE/2, rx2, ry1 + RADAR_SIZE/2, imgui.get_color_u32_rgba(1, 1, 1, 0.1))
            draw_list.add_circle(rx1 + RADAR_SIZE/2, ry1 + RADAR_SIZE/2, radar_p_radius, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 1.0 - (pulse_timer % 1.0)), num_segments=32)
            draw_list.add_circle_filled(rx1 + RADAR_SIZE/2, ry1 + RADAR_SIZE/2, 4, imgui.get_color_u32_rgba(1, 1, 1, 1), num_segments=12)
        if MENU_ANIM_PROGRESS > 0.001:
            render_top_toolbar(sw, sh)
            if PENDING_BG_IMAGE:
                try:
                    w, h = PENDING_BG_IMAGE.size
                    data = PENDING_BG_IMAGE.tobytes()
                    if CUSTOM_BG_TEXTURE is not None:
                        try: gl.glDeleteTextures([CUSTOM_BG_TEXTURE])
                        except: pass
                    CUSTOM_BG_TEXTURE = int(gl.glGenTextures(1))
                    gl.glBindTexture(gl.GL_TEXTURE_2D, CUSTOM_BG_TEXTURE)
                    gl.glPixelStorei(gl.GL_UNPACK_ALIGNMENT, 1)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                    gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, w, h, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, data)
                    PENDING_BG_IMAGE = None
                except: PENDING_BG_IMAGE = None
            for icon_name in list(ICON_IMAGES.keys()):
                img = ICON_IMAGES.pop(icon_name)
                try:
                    w, h = img.size
                    data = img.tobytes()
                    tex_id = int(gl.glGenTextures(1))
                    gl.glBindTexture(gl.GL_TEXTURE_2D, tex_id)
                    gl.glPixelStorei(gl.GL_UNPACK_ALIGNMENT, 1)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                    gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                    gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, w, h, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, data)
                    ICON_TEXTURES[icon_name] = tex_id
                except: pass
            imgui.set_next_window_size(800, 600, imgui.FIRST_USE_EVER)
            applied_anim = apply_menu_animation(sw, sh)
            imgui.begin("Glycon", True, imgui.WINDOW_NO_TITLE_BAR)
            if applied_anim: imgui.pop_style_var(1)
            main_win_pos = imgui.get_window_position()
            if CUSTOM_BG_TEXTURE is not None:
                try:
                    ww, wh = imgui.get_window_width(), imgui.get_window_height()
                    imgui.get_window_draw_list().add_image(CUSTOM_BG_TEXTURE, (main_win_pos.x, main_win_pos.y), (main_win_pos.x + ww, main_win_pos.y + wh), (0, 0), (1, 1), imgui.get_color_u32_rgba(1, 1, 1, MENU_OPACITY))
                except: pass
            imgui.begin_child("TopBar", 0, 75, border=False)
            imgui.dummy(0, 5)
            pulse_scale = 1.0 + (math.sin(time.time() * 3.0) * 0.1)
            LOGO_BREATH = (math.sin(time.time() * 2.5) + 1.0) / 2.0
            imgui.set_window_font_scale(2.2 * pulse_scale)
            lr, lg, lb = 0.54 + LOGO_BREATH*0.2, 0.17 + LOGO_BREATH*0.1, 0.89 + LOGO_BREATH*0.2
            imgui.push_style_color(imgui.COLOR_TEXT, lr, lg, lb, 1.0)
            imgui.set_cursor_pos(imgui.Vec2(20, 10))
            imgui.text("G")
            imgui.pop_style_color()
            imgui.set_window_font_scale(1.0)
            imgui.set_cursor_pos(imgui.Vec2(55, 12))
            imgui.text_colored("GLYCON", 0.9, 0.9, 0.9, 1.0)
            imgui.set_cursor_pos(imgui.Vec2(55, 28))
            imgui.text_colored("External", 0.54, 0.17, 0.89, 0.8)
            imgui.set_cursor_pos(imgui.Vec2(150, 22))
            imgui.push_style_var(imgui.STYLE_ITEM_SPACING, imgui.Vec2(8, 0))
            avail_w = imgui.get_content_region_available().x - 20
            tabs = ["AIM", "TRIGGER", "VISUALS", "PLAYERS", "CHAR", "SKY", "WORLD", "EXTRAS", "ADDICT", "RAGE", "LUA"]
            tab_w = max(50.0, avail_w / len(tabs) - 6)
            for tab in tabs:
                tab_id_map = {"TRIGGER": "TRIGGERBOT", "WORLD": "WORKSPACE", "CHAR": "CHARACTER", "ADDICT": "ADDICT", "LUA": "LUA"}
                internal_tab = tab_id_map.get(tab, tab)
                is_selected = (CURRENT_TAB == internal_tab)
                if render_styled_tab(tab, is_selected, tab_w, 35):
                    CURRENT_TAB = internal_tab
                if is_selected:
                    rmin, rmax = imgui.get_item_rect_min(), imgui.get_item_rect_max()
                    TAB_TARGET_X, TAB_TARGET_W = rmin.x, (rmax.x - rmin.x)
                imgui.same_line()
            if TAB_INDICATOR_W > 0:
                bar_y = imgui.get_item_rect_max().y
                imgui.get_window_draw_list().add_rect_filled(TAB_INDICATOR_X, bar_y - 2, TAB_INDICATOR_X + TAB_INDICATOR_W, bar_y, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 1.0))
            imgui.pop_style_var(1)
            imgui.end_child()
            imgui.push_style_var(imgui.STYLE_WINDOW_PADDING, imgui.Vec2(15, 15))
            imgui.set_cursor_pos_x(imgui.get_cursor_pos_x() + CONTENT_SLIDE_X)
            imgui.push_style_var(imgui.STYLE_ALPHA, CONTENT_ALPHA)
            imgui.begin_child("Content", 0, 0, border=True)
            imgui.text_disabled(f"{TYPEWRITER_CURRENT_TEXT}     :: {CURRENT_TAB}"); imgui.separator(); imgui.dummy(0, 10)
            if CURRENT_TAB == "AIM":
                avail_w = imgui.get_content_region_available().x
                imgui.begin_child("TogglesArea", avail_w * 0.4, 0, border=False)
                imgui.text_colored("Switches", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                _, AIMBOT_ENABLED = render_styled_checkbox("Enable Aimbot", AIMBOT_ENABLED)
                imgui.same_line(); key_label = format_key(AIM_KEY) if not WAITING_FOR_AIM_KEY else "..."
                if render_styled_button(f"{key_label}##aimkey", 50): WAITING_FOR_AIM_KEY = True
                if imgui.begin_popup_context_item("key_mode_ctx", 1):
                    if imgui.selectable("Hold")[0]: AIM_MODE = "Hold"
                    if imgui.selectable("Toggle")[0]: AIM_MODE = "Toggle"
                    imgui.end_popup()
                _, STICKY_AIM = render_styled_checkbox("Sticky Lock", STICKY_AIM)
                _, TEAM_CHECK = render_styled_checkbox("Team Check", TEAM_CHECK)
                _, AIM_KNOCK_CHECK = render_styled_checkbox("Knock Check", AIM_KNOCK_CHECK)
                _, AIM_HIT_NOTIF = render_styled_checkbox("Hit Notification", AIM_HIT_NOTIF)
                _, AIM_BOTS = render_styled_checkbox("Lock on Bots", AIM_BOTS)
                imgui.text_colored(f" Manual Bots: {len(MANUAL_BOTS)}", 0.6, 0.6, 0.6, 1.0)
                imgui.columns(2, "bot_btn_cols", False)
                if render_styled_button("Select Bot Model", -1, 25):
                    WAITING_FOR_BOT_SELECTION = True
                    CURRENT_TAB = "WORKSPACE"
                    ACTIVE_NOTIFICATIONS.append(GlyconNotification("Select a Model in Workspace tab", category="Action Required"))
                imgui.next_column()
                if render_styled_button("Clear Manual Bots", -1, 25):
                    MANUAL_BOTS.clear()
                    ACTIVE_NOTIFICATIONS.append(GlyconNotification("Manual bot list cleared", category="Action"))
                imgui.columns(1)
                _, HITSOUND_ENABLED = render_styled_checkbox("Aimbot Hitsounds", HITSOUND_ENABLED)
                if HITSOUND_ENABLED:
                    imgui.indent()
                    imgui.columns(2, "hs_cols", False)
                    imgui.push_item_width(-1)
                    _, HITSOUND_TYPE = imgui.combo("##ht", HITSOUND_TYPE, HITSOUND_NAMES)
                    imgui.pop_item_width()
                    imgui.next_column()
                    if render_styled_button("Test Audio", -1, 24):
                        play_hitsound()
                    imgui.columns(1)
                    imgui.unindent()
                _, SHOW_FOV_CIRCLE = render_styled_checkbox("FOV Circle", SHOW_FOV_CIRCLE)
                if SHOW_FOV_CIRCLE:
                    imgui.indent()
                    imgui.push_item_width(100)
                    _, AIM_FOV_COLOR = imgui.color_edit4("##aim_fov_col", *AIM_FOV_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()
                    _, AIM_FOV_FILLED = render_styled_checkbox("Filled FOV##aim", AIM_FOV_FILLED)
                    if AIM_FOV_FILLED:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, AIM_FOV_FILL_COLOR = imgui.color_edit4("Fill##aim", *AIM_FOV_FILL_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                        imgui.pop_item_width()
                        _, AIM_FOV_GRADIENT = render_styled_checkbox("Gradient Fill##aim", AIM_FOV_GRADIENT)
                        if AIM_FOV_GRADIENT:
                            imgui.same_line(); imgui.push_item_width(100)
                            _, AIM_FOV_GRAD_COLOR = imgui.color_edit4("Center##aim", *AIM_FOV_GRAD_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                            imgui.pop_item_width()
                    imgui.unindent()
                _, PREDICTION_ENABLED = render_styled_checkbox("Prediction", PREDICTION_ENABLED)
                _, JITTER_ENABLED = render_styled_checkbox("Jitter", JITTER_ENABLED)
                imgui.dummy(0, 5)
                imgui.text_colored("Resolver Settings", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                _, RESOLVER_ENABLED = render_styled_checkbox("Enable Resolver", RESOLVER_ENABLED)
                if RESOLVER_ENABLED:
                    imgui.push_item_width(-1)
                    _, RESOLVER_THRESHOLD = imgui.slider_float("##rvt", RESOLVER_THRESHOLD, 50, 500, "Vel Limit: %.1f")
                    _, RESOLVER_SAMPLES = imgui.slider_int("##rvs", RESOLVER_SAMPLES, 2, 20, "Samples: %d")
                    _, RESOLVER_PING = imgui.slider_float("##rvp", RESOLVER_PING, 0, 300, "Ping: %.1f ms")
                    imgui.pop_item_width()
                imgui.end_child(); imgui.same_line()
                imgui.begin_child("ConfigArea", 0, 0, border=False)
                imgui.text_colored("Configuration", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                imgui.push_item_width(-1)
                _, AIM_TYPE_INDEX = imgui.combo("Aim Method", AIM_TYPE_INDEX, ["Cursor", "Camera"])
                _, SMOOTHNESS = imgui.slider_float("##sm", SMOOTHNESS, 0.1, 50.0, "Smoothness: %.1f")
                _, AIM_FOV = imgui.slider_float("##fov", AIM_FOV, 10, 800, "Radius: %.1f")
                _, AIM_DISTANCE_CHECK = render_styled_checkbox("Dist Check", AIM_DISTANCE_CHECK)
                if AIM_DISTANCE_CHECK:
                    _, AIM_MAX_DISTANCE = imgui.slider_float("##mxd", AIM_MAX_DISTANCE, 50, 5000, "Max Dist: %.0f")
                if PREDICTION_ENABLED:
                    _, PREDICTION_AMOUNT = imgui.slider_float("##pr", PREDICTION_AMOUNT, 0.0, 1.0, "Predict: %.3f")
                    _, PRED_X_MULT = imgui.slider_float("##px", PRED_X_MULT, 0.0, 2.0, "Pred X: %.2f")
                    _, PRED_Y_MULT = imgui.slider_float("##py", PRED_Y_MULT, 0.0, 2.0, "Pred Y: %.2f")
                    _, PRED_Z_MULT = imgui.slider_float("##pz", PRED_Z_MULT, 0.0, 2.0, "Pred Z: %.2f")
                if JITTER_ENABLED:
                    _, JITTER_AMOUNT = imgui.slider_float("##ji", JITTER_AMOUNT, 0.0, 20.0, "Jitter: %.1f")
                imgui.text("Target Offsets")
                _, AIM_OFFSET_X = imgui.slider_float("##ox", AIM_OFFSET_X, -10.0, 10.0, "Off X: %.1f")
                _, AIM_OFFSET_Y = imgui.slider_float("##oy", AIM_OFFSET_Y, -10.0, 10.0, "Off Y: %.1f")
                _, AIM_OFFSET_Z = imgui.slider_float("##oz", AIM_OFFSET_Z, -10.0, 10.0, "Off Z: %.1f")
                imgui.text("Sens Multipliers")
                _, AIM_SENS_X = imgui.slider_float("##asx", AIM_SENS_X, 0.1, 3.0, "H-Sens: %.2f")
                _, AIM_SENS_Y = imgui.slider_float("##asy", AIM_SENS_Y, 0.1, 3.0, "V-Sens: %.2f")
                imgui.text("Target Part")
                _, TARGET_PART_INDEX = imgui.combo("##target", TARGET_PART_INDEX, BODY_PARTS)
                imgui.pop_item_width(); imgui.end_child()
            elif CURRENT_TAB == "TRIGGERBOT":
                imgui.begin_child("TriggerSub1", 0, 0, border=True)
                imgui.text_colored(" TRIGGERBOT SYSTEM", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                _, TRIGGERBOT_ENABLED = render_styled_checkbox("Enable Triggerbot", TRIGGERBOT_ENABLED)
                _, trigger_delay = imgui.slider_float("Shot Delay", trigger_delay, 0.0, 1.0)
                imgui.dummy(0, 5)
                key_text = f"Keybind: {format_key(TRIGGER_KEY)}" if not WAITING_FOR_TRIGGER_KEY else "Press any key..."
                if render_styled_button(key_text, -1, 30): WAITING_FOR_TRIGGER_KEY = True
                imgui.text_disabled("Supported for Universal games")
                imgui.end_child()
            elif CURRENT_TAB == "PLAYERS":
                avail_w = imgui.get_content_region_available().x
                imgui.begin_child("List", avail_w * 0.35, 0, border=True)
                with CACHE_LOCK:
                    for i, p_data in enumerate(PLAYER_CACHE):
                        prefix = "[*] " if p_data['ptr'] in MARKED_PLAYERS else ""
                        if imgui.selectable(f"{prefix}{p_data['name']}##{i}", SELECTED_PLAYER_INDEX == i)[0]: SELECTED_PLAYER_INDEX = i
                imgui.end_child(); imgui.same_line()
                imgui.begin_child("Actions", 0, 0, border=False)
                imgui.text_colored("Global Utils", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                if render_styled_button("Toggle Radar", -1, 30): SHOW_RADAR = not SHOW_RADAR
                if render_styled_button("Clear All Marks", -1, 30): MARKED_PLAYERS.clear()
                if render_styled_button("Force Refresh", -1, 30): INSTANCE_NODE_CACHE.clear()
                imgui.dummy(0, 5)
                imgui.text_colored("Interaction", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                with CACHE_LOCK:
                    if SELECTED_PLAYER_INDEX != -1 and SELECTED_PLAYER_INDEX < len(PLAYER_CACHE):
                        t_data = PLAYER_CACHE[SELECTED_PLAYER_INDEX]
                        
                        # Use a child for scrollable interactions if many
                        imgui.begin_child("PlayerInteractions", 0, 0, border=False)
                        
                        # --- Basic Actions ---
                        btn_w = (avail_w * 0.65 - 30) / 3
                        if render_styled_button("Mark / Unmark", btn_w, 30):
                            if t_data['ptr'] in MARKED_PLAYERS: MARKED_PLAYERS.remove(t_data['ptr'])
                            else: MARKED_PLAYERS.add(t_data['ptr'])
                        imgui.same_line(0, 8)
                        if render_styled_button("Go To", btn_w, 30):
                            l_hrp = mem.find_child_name(mem.read_ptr(mem.local_player + O_MODEL_INSTANCE), "HumanoidRootPart")
                            if l_hrp and t_data['hrp_prim']:
                                p_data_raw = mem.read_mem(t_data['hrp_prim'] + O_POSITION, 12)
                                for _ in range(50): mem.write_mem(mem.read_ptr(l_hrp + O_PRIMITIVE) + O_POSITION, p_data_raw)
                        imgui.same_line(0, 8)
                        if render_styled_button("Bring", btn_w, 30):
                            l_hrp = mem.find_child_name(mem.read_ptr(mem.local_player + O_MODEL_INSTANCE), "HumanoidRootPart")
                            if l_hrp and t_data['hrp_prim']:
                                my_data_raw = mem.read_mem(mem.read_ptr(l_hrp + O_PRIMITIVE) + O_POSITION, 12)
                                for _ in range(50): mem.write_mem(t_data['hrp_prim'] + O_POSITION, my_data_raw)
                        
                        if render_styled_button("Spectate Target", (btn_w * 1.5), 30):
                            cam = mem.read_ptr(mem.workspace + O_CAMERA)
                            if cam:
                                curr_subject = mem.read_ptr(cam + O_CAMERA_SUBJECT)
                                target_subj = t_data['hum'] if t_data['hum'] else t_data['char']
                                if curr_subject == target_subj:
                                    l_hum = LOCAL_PLAYER_INFO.get("hum")
                                    if l_hum: mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', l_hum))
                                else:
                                    if target_subj: mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', target_subj))

                        imgui.dummy(0, 5)
                        imgui.text_colored("Advanced Systems", 0.54, 0.17, 0.89, 0.8)
                        
                        btn_w = (avail_w * 0.65 - 30) / 3
                        # Loop Goto Toggle
                        is_looping = (LOOP_GOTO_TARGET_ADDR == t_data['ptr'])
                        btn_col = (0.2, 0.8, 0.2, 1.0) if is_looping else (1.0, 1.0, 1.0, 1.0)
                        imgui.push_style_color(imgui.COLOR_TEXT, *btn_col)
                        if render_styled_button("Loop Goto", btn_w, 30):
                            if is_looping: LOOP_GOTO_TARGET_ADDR = 0
                            else: 
                                LOOP_GOTO_TARGET_ADDR = t_data['ptr']
                                ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Looping to {t_data['name']}", category="Action"))
                        imgui.pop_style_color()
                        
                        imgui.same_line(0, 8)
                        # Fling Toggle
                        is_flinging = (FLING_TARGET_ADDR == t_data['ptr'])
                        btn_col = (0.8, 0.2, 0.2, 1.0) if is_flinging else (1.0, 1.0, 1.0, 1.0)
                        imgui.push_style_color(imgui.COLOR_TEXT, *btn_col)
                        if render_styled_button("Fling", btn_w, 30):
                            if is_flinging: FLING_TARGET_ADDR = 0
                            else: 
                                FLING_TARGET_ADDR = t_data['ptr']
                                ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Flinging {t_data['name']}", category="Action"))
                        imgui.pop_style_color()
                        
                        imgui.same_line(0, 8)
                        # Jumpscare
                        if render_styled_button("Jumpscare", btn_w, 30):
                            JUMPSCARE_TARGET_ADDR = t_data['ptr']
                            JUMPSCARE_START_TIME = time.time()
                            JUMPSCARE_ORIG_POS = None
                            ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Jumpscaring {t_data['name']}", category="Action"))
                        
                        # Stay Behind
                        is_staying = (STAY_BEHIND_TARGET_ADDR == t_data['ptr'])
                        btn_col = (0.3, 0.6, 1.0, 1.0) if is_staying else (1.0, 1.0, 1.0, 1.0)
                        imgui.push_style_color(imgui.COLOR_TEXT, *btn_col)
                        if render_styled_button("Stay Behind", btn_w * 1.5, 30):
                            if is_staying: STAY_BEHIND_TARGET_ADDR = 0
                            else: STAY_BEHIND_TARGET_ADDR = t_data['ptr']
                        imgui.pop_style_color()

                        imgui.same_line(0, 8)
                        # Bang
                        is_banging = (BANG_TARGET_ADDR == t_data['ptr'])
                        btn_col = (1.0, 0.4, 0.7, 1.0) if is_banging else (1.0, 1.0, 1.0, 1.0)
                        imgui.push_style_color(imgui.COLOR_TEXT, *btn_col)
                        if render_styled_button("Fuck Player", btn_w * 1.5, 30):
                            if is_banging: BANG_TARGET_ADDR = 0
                            else: BANG_TARGET_ADDR = t_data['ptr']
                        imgui.pop_style_color()

                        imgui.dummy(0, 5)
                        imgui.text_colored("Orbit Control", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                        _, ORBIT_METHOD = imgui.combo("Method", ORBIT_METHOD, ["Smooth (Client)", "Replicated (Server)"])
                        _, ORBIT_ENABLED = render_styled_checkbox("Enable Orbit", ORBIT_ENABLED)
                        imgui.push_item_width(-1)
                        _, ORBIT_RADIUS = imgui.slider_float("##rad", ORBIT_RADIUS, 5.0, 50.0, "Radius: %.1f")
                        _, ORBIT_SPEED = imgui.slider_float("##spd", ORBIT_SPEED, 0.5, 10.0, "Speed: %.1f")
                        _, ORBIT_HEIGHT = imgui.slider_float("##hgt", ORBIT_HEIGHT, -10.0, 20.0, "Height: %.1f")
                        imgui.pop_item_width()

                        imgui.dummy(0, 5)
                        imgui.text_colored("Whitelist System", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                        
                        is_whitelisted = t_data['ptr'] in WHITELISTED_PLAYERS
                        wl_label = "Remove from Whitelist" if is_whitelisted else "Add to Whitelist"
                        if render_styled_button(wl_label, -1, 26):
                            if is_whitelisted: WHITELISTED_PLAYERS.remove(t_data['ptr'])
                            else: WHITELISTED_PLAYERS.add(t_data['ptr'])
                        
                        if WHITELISTED_PLAYERS:
                            imgui.dummy(0, 2)
                            imgui.text_disabled("WHITELIST CONFIGURATION")
                            for key in WHITELIST_OPTS:
                                _, WHITELIST_OPTS[key] = render_styled_checkbox(key, WHITELIST_OPTS[key])
                        
                        imgui.end_child()
                imgui.end_child()
            elif CURRENT_TAB == "VISUALS":
                imgui.begin_child("VisualsMain", 0, 0, border=False)
                imgui.begin_child("SubSection1", 0, 220, border=True)
                imgui.text_colored(" CHARACTER RENDERING", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                imgui.columns(2, "vis_cols1", border=False)
                imgui.text_disabled("MAIN STYLE")
                
                _, SHOW_ESP = render_styled_checkbox("Full Box", SHOW_ESP)
                if SHOW_ESP:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, ESP_COLOR = imgui.color_edit4("##esp_col", *ESP_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()

                _, SHOW_FILLED_BOX = render_styled_checkbox("Filled Box", SHOW_FILLED_BOX)
                if SHOW_FILLED_BOX:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, FILLED_BOX_COLOR = imgui.color_edit4("##fill_col", *FILLED_BOX_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()
                    imgui.indent()
                    _, SHOW_GRADIENT_FILL = render_styled_checkbox("Gradient Style", SHOW_GRADIENT_FILL)
                    if SHOW_GRADIENT_FILL:
                         imgui.indent()
                         _, GRADIENT_FILL_DIRECTION = imgui.combo("Direction", GRADIENT_FILL_DIRECTION, ["Vertical", "Horizontal"])
                         
                         imgui.text("Top Color"); imgui.same_line(100); imgui.push_item_width(100)
                         _, GRADIENT_FILL_COLOR_TOP = imgui.color_edit4("##gct", *GRADIENT_FILL_COLOR_TOP, flags=imgui.COLOR_EDIT_NO_INPUTS)
                         imgui.pop_item_width()
                         
                         imgui.text("Bot Color"); imgui.same_line(100); imgui.push_item_width(100)
                         _, GRADIENT_FILL_COLOR_BOT = imgui.color_edit4("##gcb", *GRADIENT_FILL_COLOR_BOT, flags=imgui.COLOR_EDIT_NO_INPUTS)
                         imgui.pop_item_width()
                         imgui.unindent()
                    imgui.unindent()

                _, SHOW_CORNERS = render_styled_checkbox("Corner Box", SHOW_CORNERS)
                
                _, SHOW_SKELETON = render_styled_checkbox("Skeleton", SHOW_SKELETON)
                if SHOW_SKELETON:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, SKELETON_COLOR = imgui.color_edit4("##skel_col", *SKELETON_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()

                imgui.next_column()
                imgui.text_disabled("BODY EXTRAS")
                
                _, SHOW_HEAD_DOT = render_styled_checkbox("Head Dot", SHOW_HEAD_DOT)
                if SHOW_HEAD_DOT:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, HEAD_DOT_COLOR = imgui.color_edit4("##dot_col", *HEAD_DOT_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()

                _, SHOW_VIEW_LINES = render_styled_checkbox("View Vectors", SHOW_VIEW_LINES)
                if SHOW_VIEW_LINES:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, VIEW_LINE_COLOR = imgui.color_edit4("##vl_col", *VIEW_LINE_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()

                _, SHOW_GROUND_SHAPE = render_styled_checkbox("Ground Shape", SHOW_GROUND_SHAPE)
                _, SHOW_SCANNER_ESP = render_styled_checkbox("Rainbow Scan", SHOW_SCANNER_ESP)
                
                imgui.columns(1)
                imgui.end_child(); imgui.dummy(0, 10)
                imgui.begin_child("SubSection2", 0, 200, border=True)
                imgui.text_colored(" OVERLAYS & INFORMATION", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                imgui.columns(2, "vis_cols2", border=False)
                imgui.text_disabled("PLAYER INFO")
                
                _, SHOW_NAMES = render_styled_checkbox("Display Names", SHOW_NAMES)
                if SHOW_NAMES:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, TEXT_COLOR = imgui.color_edit4("##txt_col", *TEXT_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()

                _, SHOW_HEALTH = render_styled_checkbox("Health Bars", SHOW_HEALTH)
                if SHOW_HEALTH:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, HEALTH_BAR_COLOR = imgui.color_edit4("##hp_col", *HEALTH_BAR_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()
                    imgui.indent()
                    _, HEALTH_GRADIENT_ENABLED = render_styled_checkbox("HP Gradient", HEALTH_GRADIENT_ENABLED)
                    if HEALTH_GRADIENT_ENABLED:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, HEALTH_BAR_COLOR_BOT = imgui.color_edit4("##hp_grad_col", *HEALTH_BAR_COLOR_BOT, flags=imgui.COLOR_EDIT_NO_INPUTS)
                        imgui.pop_item_width()
                    imgui.unindent()

                _, SHOW_HEALTH_TEXT = render_styled_checkbox("Health Text", SHOW_HEALTH_TEXT)
                _, SHOW_DISTANCE = render_styled_checkbox("Distance Text", SHOW_DISTANCE)
                if SHOW_DISTANCE:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, DISTANCE_COLOR = imgui.color_edit4("##dist_col", *DISTANCE_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()
                
                imgui.next_column()
                imgui.text_disabled("TRACERS & TRAILS")
                
                _, SHOW_TRACERS = render_styled_checkbox("Standard Tracers", SHOW_TRACERS)
                if SHOW_TRACERS:
                    imgui.same_line(); imgui.push_item_width(80)
                    _, TRACER_THICKNESS = imgui.slider_float("Thk##tr", TRACER_THICKNESS, 0.1, 5.0)
                    imgui.same_line(); imgui.push_item_width(20)
                    _, SNAPLINE_COLOR = imgui.color_edit4("##snap_col", *SNAPLINE_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    imgui.pop_item_width()
                _, SHOW_THREAD_TRACER = render_styled_checkbox("Thread Tracer", SHOW_THREAD_TRACER)
                if SHOW_THREAD_TRACER:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, THREAD_TRACER_THICKNESS = imgui.slider_float("Thk##ttr", THREAD_TRACER_THICKNESS, 0.1, 5.0)
                    imgui.pop_item_width()
                _, SHOW_TRAILS = render_styled_checkbox("Movement Trails", SHOW_TRAILS)
                if SHOW_TRAILS:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, TRAIL_LENGTH = imgui.slider_int("Len##tr", TRAIL_LENGTH, 5, 200)
                    imgui.pop_item_width()
                imgui.columns(1)
                imgui.end_child(); imgui.dummy(0, 10)
                imgui.begin_child("SubSection3", 0, 130, border=True)
                imgui.text_colored(" RADAR & UTILITIES", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                imgui.columns(2, "vis_cols3", border=False)
                _, SHOW_OFFSCREEN = render_styled_checkbox("Offscreen Arrows", SHOW_OFFSCREEN)
                imgui.next_column()
                _, SHOW_RADAR = render_styled_checkbox("Minimap Radar", SHOW_RADAR)
                if SHOW_RADAR:
                    imgui.push_item_width(-1)
                    _, RADAR_SIZE = imgui.slider_int("##rs", int(RADAR_SIZE), 100, 400, "Size: %d")
                    _, RADAR_RANGE = imgui.slider_float("##rr", RADAR_RANGE, 50, 1000, "Range: %.1f")
                    imgui.pop_item_width()
                imgui.columns(1)
                imgui.end_child()
                imgui.end_child()
                imgui.set_next_window_position(main_win_pos.x + imgui.get_window_width() + 4, main_win_pos.y)
                imgui.set_next_window_size(320, 600)
                imgui.push_style_var(imgui.STYLE_WINDOW_ROUNDING, 12.0)
                imgui.push_style_color(imgui.COLOR_WINDOW_BACKGROUND, 0.04, 0.04, 0.06, 0.95)
                imgui.begin("ESP PREVIEW SYSTEM", True, imgui.WINDOW_NO_TITLE_BAR | imgui.WINDOW_NO_RESIZE)
                tw_list = imgui.get_window_draw_list()
                w_pos, w_size = imgui.get_window_position(), imgui.get_window_size()
                tw_list.add_rect(w_pos.x, w_pos.y, w_pos.x + w_size.x, w_pos.y + w_size.y, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.4), 12.0, thickness=1.5)
                imgui.dummy(0, 10)
                imgui.set_cursor_pos_x(15)
                imgui.text_colored(" ▣ VISUALS MONITOR", 0.54, 0.17, 0.89, 1.0)
                imgui.set_cursor_pos_x(15); imgui.separator(); imgui.dummy(0, 10)
                if AVATAR_TEXTURE:
                    imgui.set_cursor_pos(imgui.Vec2(50, 80))
                    preview_screen_pos = imgui.get_cursor_screen_pos()
                    p_draw = imgui.get_window_draw_list()
                    p_draw.add_rect_filled(preview_screen_pos.x - 10, preview_screen_pos.y - 10, preview_screen_pos.x + 230, preview_screen_pos.y + 230, imgui.get_color_u32_rgba(0.08, 0.07, 0.12, 0.6), 8.0)
                    p_draw.add_rect(preview_screen_pos.x - 10, preview_screen_pos.y - 10, preview_screen_pos.x + 230, preview_screen_pos.y + 230, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.25), 8.0, thickness=1.0)
                    imgui.image(AVATAR_TEXTURE, 220, 220, (0, 1), (1, 0))
                    hx, hy, hw, hh = preview_screen_pos.x, preview_screen_pos.y, 220, 220
                    scan_y = hy + (time.time() * 60 % hw)
                    p_draw.add_line(hx, scan_y, hx + hw, scan_y, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.15), 1.0)
                    px, py, pw, ph = preview_screen_pos.x + 45, preview_screen_pos.y + 25, 130, 170
                    p_color = imgui.get_color_u32_rgba(*ESP_COLOR)
                    if SHOW_FILLED_BOX:
                        if SHOW_GRADIENT_FILL:
                            tc = imgui.get_color_u32_rgba(*GRADIENT_FILL_COLOR_TOP)
                            bc = imgui.get_color_u32_rgba(*GRADIENT_FILL_COLOR_BOT)
                            if GRADIENT_FILL_DIRECTION == 0: # Vertical
                                p_draw.add_rect_filled_multicolor(px, py, px + pw, py + ph, tc, tc, bc, bc)
                            else: # Horizontal
                                p_draw.add_rect_filled_multicolor(px, py, px + pw, py + ph, tc, bc, bc, tc)
                        else:
                            p_draw.add_rect_filled(px, py, px + pw, py + ph, imgui.get_color_u32_rgba(*FILLED_BOX_COLOR))
                    if SHOW_ESP:
                        p_draw.add_rect(px, py, px + pw, py + ph, 0xFF000000, thickness=2.5)
                        p_draw.add_rect(px, py, px + pw, py + ph, p_color, thickness=1.0)
                    if SHOW_CORNERS:
                        cl = 25
                        pad = 4.0
                        c_px, c_py, c_pw, c_ph = px - pad, py - pad, pw + pad*2, ph + pad*2
                        p_color = imgui.get_color_u32_rgba(*ESP_COLOR)
                        def draw_preview_corner(x, y, dx, dy):
                            p_draw.add_line(x, y, x + dx, y, 0xFF000000, 3.5)
                            p_draw.add_line(x, y, x, y + dy, 0xFF000000, 3.5)
                            p_draw.add_line(x, y, x + dx, y, p_color, 1.5)
                            p_draw.add_line(x, y, x, y + dy, p_color, 1.5)
                        draw_preview_corner(c_px, c_py, cl, cl)
                        draw_preview_corner(c_px + c_pw, c_py, -cl, cl)
                        draw_preview_corner(c_px, c_py + c_ph, cl, -cl)
                        draw_preview_corner(c_px + c_pw, c_py + c_ph, -cl, -cl)
                    if SHOW_HEALTH:
                        h_off = 10 if SHOW_CORNERS else 6
                        p_draw.add_rect(px - h_off, py, px - h_off + 4, py + ph, 0xFFFFFFFF, thickness=1.0)
                        if HEALTH_GRADIENT_ENABLED:
                            c1 = imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR)
                            c2 = imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR_BOT)
                            p_draw.add_rect_filled_multicolor(px - h_off + 1, py + (ph * (1.0 - 0.85)), px - h_off + 3, py + ph, c1, c1, c2, c2)
                        else:
                            p_draw.add_rect_filled(px - h_off + 1, py + (ph * (1.0 - 0.85)), px - h_off + 3, py + ph, imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR))
                    if SHOW_NAMES:
                        p_name = "GlyconUser"
                        pw_txt, ph_txt = imgui.calc_text_size(p_name)
                        pnx, pny = px + (pw/2) - pw_txt/2, py - 20
                        p_draw.add_text(pnx, pny, imgui.get_color_u32_rgba(*TEXT_COLOR), p_name)
                    if SHOW_HEAD_DOT: p_draw.add_circle(px + (pw/2), py + 20, 10, imgui.get_color_u32_rgba(*HEAD_DOT_COLOR), thickness=1.5)
                    if SHOW_DISTANCE:
                        p_draw.add_text(px + (pw/2) - 20, py + ph + 5, imgui.get_color_u32_rgba(*DISTANCE_COLOR), "[123m]")
                    if SHOW_TRACERS: p_draw.add_line(preview_screen_pos.x + 110, preview_screen_pos.y + 350, px + (pw/2), py + ph, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.5), TRACER_THICKNESS)
                    if SHOW_THREAD_TRACER: p_draw.add_line(preview_screen_pos.x + 220, preview_screen_pos.y + 80, px + (pw/2), py + ph/2, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.4), THREAD_TRACER_THICKNESS)
                    if SHOW_VIEW_LINES: p_draw.add_line(px + (pw/2), py + 20, px + (pw/2) + 25, py + 35, 0xFF0000FF, 1.5)
                    if SHOW_TRAILS:
                        p_draw.add_line(px + pw/2 - 15, py + ph - 10, px + pw/2, py + ph - 30, imgui.get_color_u32_rgba(*TRAIL_COLOR), 1.2)
                        p_draw.add_line(px + pw/2 - 30, py + ph + 10, px + pw/2 - 15, py + ph - 10, imgui.get_color_u32_rgba(*TRAIL_COLOR), 1.2)
                    if SHOW_SKELETON:
                        sk_col = 0xFFFFFFFF
                        p_draw.add_line(px + pw/2, py + 25, px + pw/2, py + 100, sk_col)
                        p_draw.add_line(px + pw/2, py + 40, px + pw/2 - 30, py + 80, sk_col)
                        p_draw.add_line(px + pw/2, py + 40, px + pw/2 + 30, py + 80, sk_col)
                        p_draw.add_line(px + pw/2, py + 100, px + pw/2 - 20, py + 150, sk_col)
                        p_draw.add_line(px + pw/2, py + 100, px + pw/2 + 20, py + 150, sk_col)
                    if SHOW_SCANNER_ESP:
                        sh_off = math.sin(time.time() * 3.0) * 10.0
                        rb_h, rb_s, rb_v = (time.time() * 0.5) % 1.0, 1.0, 1.0
                        rb_r, rb_g, rb_b = imgui.color_convert_hsv_to_rgb(rb_h, rb_s, rb_v)
                        p_draw.add_circle(px + pw/2, py + ph/2 + sh_off, 25, imgui.get_color_u32_rgba(rb_r, rb_g, rb_b, 1.0), thickness=1.0)
                else:
                    imgui.set_cursor_pos(imgui.Vec2(60, 180))
                    imgui.text_disabled("Avatar Loading...")
                imgui.set_cursor_pos(imgui.Vec2(20, 530))
                imgui.text_colored("Preview: ", 0.7, 0.7, 0.8, 1.0); imgui.same_line()
                imgui.text_colored("Enabled", 0.0, 1.0, 0.0, 1.0)
                imgui.set_cursor_pos(imgui.Vec2(20, 550))
                imgui.text_disabled("sea was here")
                imgui.end()
                imgui.pop_style_color()
                imgui.pop_style_var()
            elif CURRENT_TAB == "CHARACTER":
                imgui.begin_child("CharSub1", 0, 190, border=True)
                imgui.text_colored(" STAT MODIFIERS", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                ws_key_lbl = format_key(WS_KEY) if not WAITING_FOR_WS_KEY else "..."
                if render_styled_button(f"{ws_key_lbl}##ws_k", 65, 20): WAITING_FOR_WS_KEY = True
                imgui.same_line(); _, TOGGLE_WS = render_styled_checkbox("Speed Hack", TOGGLE_WS)
                avail_w = imgui.get_content_region_available().x
                imgui.same_line(avail_w - 240 if avail_w > 400 else 180); imgui.push_item_width(240)
                _, WALKSPEED_VAL = imgui.slider_float("##ws", WALKSPEED_VAL, 0.0, 500.0); imgui.pop_item_width()
                jp_key_lbl = format_key(JP_KEY) if not WAITING_FOR_JP_KEY else "..."
                if render_styled_button(f"{jp_key_lbl}##jp_k", 65, 20): WAITING_FOR_JP_KEY = True
                imgui.same_line(); _, TOGGLE_JP = render_styled_checkbox("Jump Power", TOGGLE_JP)
                imgui.same_line(avail_w - 240 if avail_w > 400 else 180); imgui.push_item_width(240)
                _, JUMPPOWER_VAL = imgui.slider_float("##jp", JUMPPOWER_VAL, 0.0, 500.0); imgui.pop_item_width()
                hh_key_lbl = format_key(HH_KEY) if not WAITING_FOR_HH_KEY else "..."
                if render_styled_button(f"{hh_key_lbl}##hh_k", 65, 20): WAITING_FOR_HH_KEY = True
                imgui.same_line(); _, TOGGLE_HH = render_styled_checkbox("Hip Height", TOGGLE_HH)
                imgui.same_line(avail_w - 240 if avail_w > 400 else 180); imgui.push_item_width(240)
                _, HIPHEIGHT_VAL = imgui.slider_float("##hh", HIPHEIGHT_VAL, 0.0, 50.0); imgui.pop_item_width()
                imgui.end_child(); imgui.dummy(0, 10)
                imgui.begin_child("CharSub2", 0, 0, border=True)
                imgui.text_colored(" MOVEMENT UTILS", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                ij_key_lbl = format_key(INF_JUMP_KEY) if not WAITING_FOR_INF_JUMP_KEY else "..."
                if render_styled_button(f"{ij_key_lbl}##ij_k", 65, 20): WAITING_FOR_INF_JUMP_KEY = True
                imgui.same_line(); _, TOGGLE_INF_JUMP = render_styled_checkbox("Infinite Jump (Hold Space)", TOGGLE_INF_JUMP)
                nc_key_lbl = format_key(NOCLIP_KEY) if not WAITING_FOR_NOCLIP_KEY else "..."
                if render_styled_button(f"{nc_key_lbl}##nc_k", 65, 20): WAITING_FOR_NOCLIP_KEY = True
                imgui.same_line(); _, TOGGLE_NOCLIP = render_styled_checkbox("Noclip (issues)", TOGGLE_NOCLIP)
                fly_key_lbl = format_key(FLY_KEY) if not WAITING_FOR_FLY_KEY else "..."
                if render_styled_button(f"{fly_key_lbl}##fly_k", 65, 20): WAITING_FOR_FLY_KEY = True
                imgui.same_line(); _, TOGGLE_FLY = render_styled_checkbox("Fly", TOGGLE_FLY)
                if TOGGLE_FLY:
                    imgui.same_line(240); imgui.push_item_width(180)
                    _, FLY_SPEED = imgui.slider_float("##fs", FLY_SPEED, 0.1, 10.0); imgui.pop_item_width()
                sb_key_lbl = format_key(SPINBOT_KEY) if not WAITING_FOR_SPINBOT_KEY else "..."
                if render_styled_button(f"{sb_key_lbl}##sb_k", 65, 20): WAITING_FOR_SPINBOT_KEY = True
                imgui.same_line(); _, SPINBOT_ENABLED = render_styled_checkbox("Spinbot", SPINBOT_ENABLED)
                if SPINBOT_ENABLED:
                    avail_w = imgui.get_content_region_available().x
                    imgui.same_line(max(240, avail_w - 180)); imgui.push_item_width(180)
                    _, SPINBOT_SPEED = imgui.slider_float("##sbs", SPINBOT_SPEED, 0.1, 100.0, "Speed: %.1f"); imgui.pop_item_width()
                imgui.end_child(); imgui.dummy(0, 10)
                
                imgui.begin_child("CharSub3", 0, 140, border=True)
                imgui.text_colored(" ENGINE MODS", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                _, TOGGLE_FOV_MOD = render_styled_checkbox("Camera FOV", TOGGLE_FOV_MOD); imgui.same_line(150)
                _, FOV_VAL = imgui.slider_float("##mfov", FOV_VAL, 30.0, 150.0)
                _, TOGGLE_GRAVITY = render_styled_checkbox("Gravity Mod", TOGGLE_GRAVITY); imgui.same_line(150)
                _, GRAVITY_VAL = imgui.slider_float("##grav", GRAVITY_VAL, 0.0, 1000.0, "Force: %.1f")
                if render_styled_button("Reset Gravity", -1, 20): GRAVITY_VAL = 196.2
                imgui.end_child()
            elif CURRENT_TAB == "EXTRAS":
                imgui.begin_child("ExtrasSub1", 0, 0, border=True)
                imgui.text_colored(" EXTRA UTILITIES", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                
                imgui.columns(2, "silent_bot_cols", False)
                if render_styled_button("Select Bot Model", -1, 23):
                    WAITING_FOR_BOT_SELECTION = True
                    CURRENT_TAB = "WORKSPACE"
                    ACTIVE_NOTIFICATIONS.append(GlyconNotification("Select a Model in Workspace tab", category="Action Required"))
                imgui.next_column()
                if render_styled_button("Clear Manual Bots", -1, 23):
                    MANUAL_BOTS.clear()
                    ACTIVE_NOTIFICATIONS.append(GlyconNotification("Manual bot list cleared", category="Action"))
                imgui.columns(1); imgui.dummy(0, 5)

                _, SILENT_AIM_ENABLED = render_styled_checkbox("Silent Aim (dh & dh copies)", SILENT_AIM_ENABLED)
                if SILENT_AIM_ENABLED:
                    imgui.indent()
                    _, SILENT_AIM_METHOD = imgui.combo("Targeting Method", SILENT_AIM_METHOD, ["Closest to Mouse", "Closest to Camera"])
                    _, SILENT_AIM_PART_MODE = imgui.combo("Part Mode", SILENT_AIM_PART_MODE, ["Selected Part", "Closest Part", "Closest Point"])
                    if SILENT_AIM_PART_MODE == 0:
                        _, SILENT_AIM_PART_INDEX = imgui.combo("Target Part", SILENT_AIM_PART_INDEX, BODY_PARTS)
                    _, SILENT_AIM_PREDICTION = render_styled_checkbox("Silent Prediction", SILENT_AIM_PREDICTION)
                    if SILENT_AIM_PREDICTION:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, SILENT_AIM_PRED_X = imgui.slider_float("X##sp", SILENT_AIM_PRED_X, 0.1, 10.0)
                        imgui.same_line(); _, SILENT_AIM_PRED_Y = imgui.slider_float("Y##sp", SILENT_AIM_PRED_Y, 0.1, 10.0)
                        imgui.pop_item_width()
                    _, SILENT_AIM_FOV = imgui.slider_float("Silent FOV", SILENT_AIM_FOV, 10.0, 1000.0)
                    _, SHOW_SILENT_TRACER = render_styled_checkbox("Show Silent Tracer", SHOW_SILENT_TRACER)
                    _, SILENT_AIM_STICKY = render_styled_checkbox("Sticky Target##silent", SILENT_AIM_STICKY)
                    _, SILENT_AIM_TEAM_CHECK = render_styled_checkbox("Team Check##silent", SILENT_AIM_TEAM_CHECK)
                    _, SILENT_AIM_SPOOF_MOUSE = render_styled_checkbox("Spoof Mouse Frame", SILENT_AIM_SPOOF_MOUSE)
                    _, SILENT_AIM_SMOOTHNESS = imgui.slider_float("Silent Smoothness", SILENT_AIM_SMOOTHNESS, 1.0, 20.0, "%.1f (1=Instant)")
                    _, SILENT_AIM_KNOCK_CHECK = render_styled_checkbox("Knock Check##silent", SILENT_AIM_KNOCK_CHECK)
                    _, SILENT_AIM_HIT_NOTIF = render_styled_checkbox("Hit Notification##silent", SILENT_AIM_HIT_NOTIF)
                    _, SILENT_AIM_DISTANCE_CHECK = render_styled_checkbox("Distance Check##silent", SILENT_AIM_DISTANCE_CHECK)
                    if SILENT_AIM_DISTANCE_CHECK:
                        _, SILENT_AIM_MAX_DISTANCE = imgui.slider_float("Max Distance##silent", SILENT_AIM_MAX_DISTANCE, 50, 5000, "%.0f studs")
                    imgui.unindent(); imgui.separator(); imgui.dummy(0, 5)
                
                _, VIEWPORT_SILENT_AIM_ENABLED = render_styled_checkbox("Legit Silent Aim (dh, rivals+)", VIEWPORT_SILENT_AIM_ENABLED)
                imgui.text_disabled("Only works when you zoom in")
                if VIEWPORT_SILENT_AIM_ENABLED:
                    imgui.indent()
                    _, VIEWPORT_SILENT_PART_MODE = imgui.combo("Target Mode##vp", VIEWPORT_SILENT_PART_MODE, ["Selected Part", "Closest Part", "Closest Point"])
                    if VIEWPORT_SILENT_PART_MODE == 0:
                        _, VIEWPORT_SILENT_PART_INDEX = imgui.combo("Target Part##vp", VIEWPORT_SILENT_PART_INDEX, BODY_PARTS)
                    _, VIEWPORT_SILENT_FOV = imgui.slider_float("FOV##vp", VIEWPORT_SILENT_FOV, 10.0, 1000.0)
                    _, VIEWPORT_SILENT_SHOW_FOV = render_styled_checkbox("Show FOV Circle##vp", VIEWPORT_SILENT_SHOW_FOV)
                    if VIEWPORT_SILENT_SHOW_FOV:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, VIEWPORT_SILENT_FOV_COLOR = imgui.color_edit4("##vp_fov_col", *VIEWPORT_SILENT_FOV_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                        imgui.pop_item_width()
                        _, VIEWPORT_SILENT_FOV_FILLED = render_styled_checkbox("Filled FOV##vp", VIEWPORT_SILENT_FOV_FILLED)
                        if VIEWPORT_SILENT_FOV_FILLED:
                            imgui.same_line(); imgui.push_item_width(100)
                            _, VIEWPORT_SILENT_FOV_FILL_COLOR = imgui.color_edit4("Fill##vp", *VIEWPORT_SILENT_FOV_FILL_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                            imgui.pop_item_width()
                            _, VIEWPORT_SILENT_FOV_GRADIENT = render_styled_checkbox("Gradient Fill##vp", VIEWPORT_SILENT_FOV_GRADIENT)
                            if VIEWPORT_SILENT_FOV_GRADIENT:
                                imgui.same_line(); imgui.push_item_width(100)
                                _, VIEWPORT_SILENT_FOV_GRAD_COLOR = imgui.color_edit4("Center##vp", *VIEWPORT_SILENT_FOV_GRAD_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                                imgui.pop_item_width()
                    _, VIEWPORT_SILENT_HIT_NOTIF = render_styled_checkbox("Hit Notification##vp", VIEWPORT_SILENT_HIT_NOTIF)
                    imgui.unindent()
                imgui.separator(); imgui.dummy(0, 5)
                
                _, AUTO_PARRY_ENABLED = render_styled_checkbox("Auto Parry (Ball)", AUTO_PARRY_ENABLED)
                if AUTO_PARRY_ENABLED:
                    imgui.indent()
                    _, AUTO_PARRY_RANGE = imgui.slider_float("Parry Distance", AUTO_PARRY_RANGE, 5.0, 50.0, "%.1f studs")
                    _, AUTO_PARRY_MODE = imgui.combo("Parry Type", AUTO_PARRY_MODE, ["Simulate F Key", "Simulate Mouse Click"])
                    imgui.unindent()
                imgui.separator(); imgui.dummy(0, 5)
                
                _, HITBOX_EXPANDER_ENABLED = render_styled_checkbox("Hitbox Expander", HITBOX_EXPANDER_ENABLED)
                if HITBOX_EXPANDER_ENABLED:
                    imgui.indent()
                    _, HITBOX_SIZE_VAL = imgui.slider_float("Expansion Size", HITBOX_SIZE_VAL, 1.0, 50.0, "%.1f studs")
                    _, HITBOX_VISUALIZER_ENABLED = render_styled_checkbox("Show Expanded Hitbox", HITBOX_VISUALIZER_ENABLED)
                    if HITBOX_VISUALIZER_ENABLED:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, HITBOX_VISUALIZER_COLOR = imgui.color_edit4("##hb_col", *HITBOX_VISUALIZER_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                        imgui.pop_item_width()
                    imgui.unindent()
                imgui.separator(); imgui.dummy(0, 5)

                _, CLICK_TP_ENABLED = render_styled_checkbox("Click to Teleport (issues)", CLICK_TP_ENABLED)
                imgui.text_disabled("Ctrl + click")
                _, SS_DESYNC_ENABLED = render_styled_checkbox("Serversided Desync", SS_DESYNC_ENABLED)
                imgui.text_disabled("Uses watermelon")
                _, NO_JUMP_COOLDOWN_ENABLED = render_styled_checkbox("No Jump Cooldown", NO_JUMP_COOLDOWN_ENABLED)
                imgui.text_disabled("Bypass jump cooldown restrictions")
                _, RAPIDFIRE_ENABLED = render_styled_checkbox("Rapidfire", RAPIDFIRE_ENABLED)
                imgui.text_disabled("Insane fire rate for Combat tools")
                _, RAPID_FIRE_BETA_ENABLED = render_styled_checkbox("Rapid Fire Beta", RAPID_FIRE_BETA_ENABLED)
                if RAPID_FIRE_BETA_ENABLED:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, RAPID_FIRE_BETA_VAL = imgui.slider_float("Rate##rfb", RAPID_FIRE_BETA_VAL, 0.001, 1.0)
                    imgui.pop_item_width()
                imgui.text_disabled("Modifies FireRate in ReplicatedStorage")
                imgui.separator(); imgui.dummy(0, 5)
                _, TOGGLE_TICK_RATE = render_styled_checkbox("World Tick Rate", TOGGLE_TICK_RATE)
                if TOGGLE_TICK_RATE:
                    imgui.same_line(); imgui.push_item_width(100)
                    _, TICK_RATE_VAL = imgui.slider_float("##tick", TICK_RATE_VAL, 1.0, 240.0, "%.1f Hz")
                    imgui.pop_item_width()
                imgui.text_disabled("Directly modifies World physics simulation rate")
                imgui.separator(); imgui.dummy(0, 5)
                imgui.text_colored("COSMETICS", 0.54, 0.17, 0.89, 1.0)
                
                _, TOGGLE_KORBLOX = render_styled_checkbox("Korblox (Right Leg)", TOGGLE_KORBLOX)
                imgui.same_line(); imgui.push_item_width(100)
                _, KORBLOX_MODE = imgui.combo("##kb_mode", KORBLOX_MODE, ["Client (Destroy)", "Server (Void)"])
                imgui.pop_item_width()
                
                _, TOGGLE_HEADLESS = render_styled_checkbox("Headless (Head)", TOGGLE_HEADLESS)
                imgui.same_line(); imgui.push_item_width(100)
                _, HEADLESS_MODE = imgui.combo("##hl_mode", HEADLESS_MODE, ["Client (Destroy)", "Server (Void)"])
                imgui.pop_item_width()
                
                imgui.text_disabled("Warning: no issues bruh i was joking")
                imgui.end_child()
            elif CURRENT_TAB == "SKY":
                imgui.begin_child("SkyMain", 0, 0, border=False)
                imgui.begin_child("SkySub1", 0, 310, border=True)
                imgui.text_colored(" LIGHTING MODIFIERS", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                
                _, SKY_ENABLED = render_styled_checkbox("Enable Custom Lighting", SKY_ENABLED)
                
                if SKY_ENABLED:
                    imgui.indent()
                    _, TOGGLE_TIME = render_styled_checkbox("Lock Clock Time", TOGGLE_TIME)
                    if TOGGLE_TIME:
                        _, TIME_VAL = imgui.slider_float("Time (Hours)", TIME_VAL, 0.0, 24.0, "%.1f")
                    
                    _, SKY_BRIGHTNESS = imgui.slider_float("Exposure / Brightness", SKY_BRIGHTNESS, 0.0, 10.0, "%.2f")
                    
                    imgui.columns(2, "sky_cols1", border=False)
                    imgui.text("Ambient"); imgui.same_line(125)
                    _, SKY_AMBIENT = imgui.color_edit3("##amb", *SKY_AMBIENT, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.text("Outdoor Amb"); imgui.same_line(125)
                    _, SKY_OUTDOOR_AMBIENT = imgui.color_edit3("##oamb", *SKY_OUTDOOR_AMBIENT, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.next_column()
                    
                    imgui.text("Shift Top"); imgui.same_line(100)
                    _, SKY_COLOR_SHIFT_TOP = imgui.color_edit3("##ctop", *SKY_COLOR_SHIFT_TOP, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.text("Shift Bot"); imgui.same_line(100)
                    _, SKY_COLOR_SHIFT_BOT = imgui.color_edit3("##cbot", *SKY_COLOR_SHIFT_BOT, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.columns(1)
                    imgui.dummy(0, 5)
                    _, SKY_ENVIRO_DIFFUSE = imgui.slider_float("Diffuse Scale", SKY_ENVIRO_DIFFUSE, 0.0, 2.0, "%.2f")
                    _, SKY_ENVIRO_SPECULAR = imgui.slider_float("Specular Scale", SKY_ENVIRO_SPECULAR, 0.0, 2.0, "%.2f")
                    
                    if render_styled_button("Reset to Default Lighting", -1, 30):
                        SKY_BRIGHTNESS = 1.0; SKY_ENVIRO_DIFFUSE = 1.0; SKY_ENVIRO_SPECULAR = 1.0
                        SKY_AMBIENT = [0.5, 0.5, 0.5]; SKY_OUTDOOR_AMBIENT = [0.5, 0.5, 0.5]
                        SKY_COLOR_SHIFT_TOP = [1.0, 1.0, 1.0]; SKY_COLOR_SHIFT_BOT = [1.0, 1.0, 1.0]

                    imgui.unindent()
                
                imgui.separator(); imgui.dummy(0, 5)
                
                _, TOGGLE_SKYBOX = render_styled_checkbox("Change Skybox", TOGGLE_SKYBOX)
                if TOGGLE_SKYBOX:
                    imgui.indent()
                    _, SKYBOX_INDEX = imgui.combo("Style##sky", SKYBOX_INDEX, ["Galaxy", "Deep Vibe", "Classic Unreal", "Nebula Purple", "Crimson Sunset"])
                    imgui.unindent()
                
                imgui.end_child()
                imgui.dummy(0, 10)
                
                imgui.begin_child("AtmosphereSub", 0, 150, border=True)
                imgui.text_colored(" ATMOSPHERE & FOG", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                _, TOGGLE_FOG = render_styled_checkbox("Enable Fog Modifier", TOGGLE_FOG)
                if TOGGLE_FOG:
                    imgui.indent()
                    _, FOG_START_VAL = imgui.slider_float("Start Distance", FOG_START_VAL, 0.0, 1000.0, "%.3f")
                    _, FOG_END_VAL = imgui.slider_float("End Distance", FOG_END_VAL, 0.0, 100000.0, "%.3f")
                    _, TOGGLE_FOG_HUE = render_styled_checkbox("Fog Hue (Color)", TOGGLE_FOG_HUE)
                    if TOGGLE_FOG_HUE:
                        imgui.same_line(); imgui.push_item_width(100)
                        _, FOG_HUE_COLOR = imgui.color_edit3("##fog_col", *FOG_HUE_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                        imgui.pop_item_width()
                    imgui.unindent()
                
                imgui.separator(); imgui.dummy(0, 5)
                _, SKY_ATMOS_ENABLED = render_styled_checkbox("Enable Atmosphere Mod", SKY_ATMOS_ENABLED)
                if SKY_ATMOS_ENABLED:
                    imgui.indent()
                    _, SKY_ATMOS_DENSITY = imgui.slider_float("Density", SKY_ATMOS_DENSITY, 0.0, 1.0, "%.2f")
                    _, SKY_ATMOS_HAZE = imgui.slider_float("Haze", SKY_ATMOS_HAZE, 0.0, 10.0, "%.1f")
                    _, SKY_ATMOS_GLARE = imgui.slider_float("Glare", SKY_ATMOS_GLARE, 0.0, 10.0, "%.1f")
                    
                    imgui.text("Atmos Color"); imgui.same_line(125)
                    _, SKY_ATMOS_COLOR = imgui.color_edit3("##atc", *SKY_ATMOS_COLOR, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.text("Decay Color"); imgui.same_line(125)
                    _, SKY_ATMOS_DECAY = imgui.color_edit3("##atd", *SKY_ATMOS_DECAY, flags=imgui.COLOR_EDIT_NO_INPUTS)
                    
                    imgui.unindent()
                
                imgui.end_child()
                imgui.end_child()
            elif CURRENT_TAB == "WORKSPACE":
                imgui.begin_child("ExplorerList", 300, 0, border=True)
                imgui.text_colored(" INSTANCE TREE", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                
                imgui.push_item_width(-1)
                _, EXPLORER_SEARCH = imgui.input_text("##exp_search", EXPLORER_SEARCH, 64)
                imgui.pop_item_width()
                
                if render_styled_button("REFRESH EXPLORER", -1): EXPLORER_CACHE.clear()
                imgui.separator()
                imgui.begin_child("InnerTree")
                if mem.data_model:
                     for child in mem.get_children(mem.data_model):
                         render_instance_tree(mem, child, EXPLORER_SEARCH)
                imgui.end_child() # InnerTree
                imgui.end_child(); imgui.same_line() # ExplorerList
                imgui.begin_child("Properties", 0, 0, border=True)
                imgui.text_colored(" PROPERTIES", 0.54, 0.17, 0.89, 1.0); imgui.separator()
                if WAITING_FOR_BOT_SELECTION:
                    imgui.text_colored("--- SELECTION MODE ACTIVE ---", 1.0, 0.8, 0.0, 1.0)
                    if EXPLORER_SELECTED_ADDR:
                        if render_styled_button("SUBMIT AS BOT MODEL", -1, 40):
                            # Force a fresh class/child scan for this address
                            if EXPLORER_SELECTED_ADDR in INSTANCE_NODE_CACHE:
                                del INSTANCE_NODE_CACHE[EXPLORER_SELECTED_ADDR]
                            
                            hum = mem.find_class(EXPLORER_SELECTED_ADDR, "Humanoid")
                            if hum:
                                MANUAL_BOTS.add(EXPLORER_SELECTED_ADDR)
                                ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Bots Added! ({mem.read_str(mem.read_ptr(EXPLORER_SELECTED_ADDR + O_NAME))})", category="Success"))
                                WAITING_FOR_BOT_SELECTION = False
                            else:
                                ACTIVE_NOTIFICATIONS.append(GlyconNotification("No Humanoid found in target", category="Error"))
                    imgui.separator()
                if EXPLORER_SELECTED_ADDR:
                    sel = EXPLORER_SELECTED_ADDR
                    imgui.text(f"Address: 0x{sel:X}")
                    name = mem.read_str(mem.read_ptr(sel + O_NAME))
                    _, new_name = imgui.input_text("Name", name, 64)
                    if imgui.is_item_deactivated_after_edit():
                        mem.write_str(mem.read_ptr(sel + O_NAME), new_name)
                    imgui.text(f"Class: {mem.get_class_name(sel)}")
                    for prop, off in [("Transparency", O_TRANSPARENCY), ("Reflectance", 0x100)]:
                        try:
                            val = struct.unpack('f', mem.read_mem(sel + off, 4))[0]
                            _, n_val = imgui.slider_float(prop, val, 0.0, 1.0)
                            if n_val != val: mem.write_mem(sel + off, struct.pack('f', n_val))
                        except: pass
                    prim = mem.read_ptr(sel + O_PRIMITIVE)
                    if prim:
                        pos_raw = mem.read_mem(prim + O_POSITION, 12)
                        if pos_raw:
                            px, py, pz = struct.unpack('fff', pos_raw)
                    imgui.columns(2, "clip_cols", False)
                    if render_styled_button("COPY", -1, 30):
                        EXPLORER_CLIPBOARD_ADDR = sel
                    imgui.next_column()
                    if render_styled_button("CUT", -1, 30):
                        EXPLORER_CLIPBOARD_ADDR = sel
                        mem.write_mem(sel + O_PARENT, struct.pack('Q', 0))
                        EXPLORER_CACHE.clear()
                    imgui.columns(1)
                    if EXPLORER_CLIPBOARD_ADDR:
                        clip_name = mem.read_str(mem.read_ptr(EXPLORER_CLIPBOARD_ADDR + O_NAME))
                        imgui.text_disabled(f"Clipboard: {clip_name}")
                        if render_styled_button("PASTE INTO", -1, 30):
                            mem.write_mem(EXPLORER_CLIPBOARD_ADDR + O_PARENT, struct.pack('Q', sel))
                            EXPLORER_CACHE.clear()
                    imgui.dummy(0, 10)
                    if render_styled_button("DESTROY INSTANCE", -1, 35):
                        try:
                            mem.write_mem(sel + O_PARENT, struct.pack('Q', 0))
                            cls = mem.get_class_name(sel)
                            if "Part" in cls or "Operation" in cls:
                                mem.write_mem(sel + O_TRANSPARENCY, struct.pack('f', 1.0))
                                prim = mem.read_ptr(sel + O_PRIMITIVE)
                                if prim: mem.write_mem(prim + O_CAN_COLLIDE, b'\x00')
                            EXPLORER_CACHE.clear()
                            EXPLORER_SELECTED_ADDR = 0
                        except: pass
                    imgui.dummy(0, 5)
                    imgui.text_disabled("Local Client-side Deletion Only")
                else:
                    imgui.text_disabled("Select an instance to view properties")
                imgui.end_child()
            elif CURRENT_TAB == "SETTINGS":
                imgui.begin_child("SettingsMain", 0, 0, border=False)
                imgui.begin_child("ConfigPanel", 0, 260, border=True)
                imgui.text_colored(" PROFILE MANAGEMENT", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                imgui.columns(2, "cfg_cols", border=False)
                imgui.text_disabled("PROFILE NAME")
                imgui.push_item_width(-1)
                _, CONFIG_NAME = imgui.input_text("##cfg_name", CONFIG_NAME, 32)
                imgui.pop_item_width()
                if render_styled_button("Save New Profile", -1, 35):
                    save_config(CONFIG_NAME)
                    AVAILABLE_CONFIGS = get_configs()
                imgui.next_column()
                imgui.text_disabled("SAVED PROFILES")
                if AVAILABLE_CONFIGS:
                    imgui.push_item_width(-1)
                    _, LOAD_LIST_INDEX = imgui.combo("##cfg_list", LOAD_LIST_INDEX, AVAILABLE_CONFIGS)
                    imgui.pop_item_width()
                    imgui.dummy(0, 3)
                    imgui.columns(2, "cfg_actions", border=False)
                    if render_styled_button("Load Profile", -1, 30):
                        load_config(AVAILABLE_CONFIGS[LOAD_LIST_INDEX])
                        ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Loaded: {AVAILABLE_CONFIGS[LOAD_LIST_INDEX]}", category="Config"))
                    imgui.next_column()
                    if render_styled_button("Set Auto", -1, 30):
                        set_autoload(AVAILABLE_CONFIGS[LOAD_LIST_INDEX])
                        ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Autoload: {AVAILABLE_CONFIGS[LOAD_LIST_INDEX]}", category="Config"))
                    imgui.columns(1)
                else:
                    imgui.text_disabled("No profiles found.")
                imgui.columns(1)
                imgui.dummy(0, 10)
                cur_auto = get_autoload()
                imgui.text_colored(f"  Current Autoload: {cur_auto if cur_auto else 'None'}", 0.6, 0.6, 0.6, 1.0)
                imgui.end_child(); imgui.dummy(0, 10)
                imgui.begin_child("MenuCustomization", 0, 160, border=True)
                imgui.text_colored(" UI APPEARANCE", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                imgui.columns(2, "ui_cols", border=False)
                imgui.text_disabled("MENU OPACITY")
                changed, n_opac = imgui.slider_float("##opac", MENU_OPACITY, 0.1, 1.0, "%.2f")
                if changed:
                    MENU_OPACITY = n_opac
                    apply_advanced_theme(MENU_OPACITY)
                imgui.next_column()
                imgui.text_disabled("WINDOW BACKGROUND")
                if render_styled_button("Browse Image...", -1, 30):
                    file_path = select_file_dialog()
                    if file_path:
                        if load_custom_background(file_path):
                            ACTIVE_NOTIFICATIONS.append(GlyconNotification("Background Updated", category="UI"))
                        else:
                            ACTIVE_NOTIFICATIONS.append(GlyconNotification("Invalid Image", category="Error"))
                if CUSTOM_BG_TEXTURE:
                    if render_styled_button("Reset Default", -1, 30):
                        CUSTOM_BG_TEXTURE = None
                        CUSTOM_BG_PATH = ""
                imgui.columns(1)
                imgui.end_child(); imgui.dummy(0, 10)
                imgui.begin_child("SystemPanel", 0, 150, border=True)
                imgui.text_colored(" SYSTEM", 0.54, 0.17, 0.89, 1.0); imgui.separator(); imgui.dummy(0, 5)
                
                changed, STREAM_PROOF_ENABLED = render_styled_checkbox("Stream Proof (Hide from Capture)", STREAM_PROOF_ENABLED)
                if changed:
                    # 0x00000000 = WDA_NONE, 0x00000011 = WDA_EXCLUDEFROMCAPTURE (Windows 10 2004+)
                    # Use 0x1 as fallback for older Windows (WDA_MONITOR)
                    affinity = 0x00000011 if STREAM_PROOF_ENABLED else 0x00000000
                    try:
                        ctypes.windll.user32.SetWindowDisplayAffinity(GL_HWND, affinity)
                        status = "Enabled" if STREAM_PROOF_ENABLED else "Disabled"
                        ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Stream Proof: {status}", category="System"))
                    except:
                        pass

                if render_styled_button("TERMINATE GLYCON", -1, 40):
                    glfw.set_window_should_close(window, True)
                imgui.dummy(0, 5)
                text = "Glycon External :: Final Build :: 2.0.0"
                tw = imgui.calc_text_size(text)[0]
                imgui.set_cursor_pos_x((imgui.get_window_width() - tw) / 2)
                imgui.text_disabled(text)
                imgui.end_child()
                imgui.end_child()
            elif CURRENT_TAB == "LUA":
                avail_w = imgui.get_content_region_available().x
                imgui.begin_child("LuaMain", 0.0, 0.0, border=False)
                
                # Top Editor Section
                imgui.push_style_var(imgui.STYLE_CHILD_ROUNDING, 12.0)
                imgui.begin_child("ScriptEditor", 0.0, -260.0, border=True)
                imgui.set_cursor_pos(imgui.Vec2(15, 12))
                imgui.text_colored(" LUA SCRIPT EDITOR", 0.54, 0.17, 0.89, 1.0)
                imgui.same_line(avail_w - 150)
                if render_styled_button("Clear Editor", 130, 24):
                    LUA_SCRIPT_TEXT = ""
                imgui.separator(); imgui.dummy(0, 5)
                
                # Custom Editor Style
                imgui.push_style_color(imgui.COLOR_FRAME_BACKGROUND, 0.05, 0.05, 0.07, 1.0)
                imgui.push_style_var(imgui.STYLE_FRAME_PADDING, imgui.Vec2(10, 10))
                changed, LUA_SCRIPT_TEXT = imgui.input_text_multiline("##lua_editor", LUA_SCRIPT_TEXT, 65535, 0.0, 0.0)
                imgui.pop_style_var()
                imgui.pop_style_color()
                imgui.end_child()
                
                # Bottom Console Section
                imgui.dummy(0, 10)
                imgui.begin_child("Console", 0.0, -80.0, border=True)
                imgui.set_cursor_pos(imgui.Vec2(15, 12))
                imgui.text_colored(" CONSOLE OUTPUT", 0.54, 0.17, 0.89, 1.0)
                imgui.same_line(avail_w - 150)
                if render_styled_button("Clear Console", 130, 24):
                    LUA_CONSOLE_OUTPUT = []
                imgui.separator(); imgui.dummy(0, 5)
                
                imgui.begin_child("InnerText", 0, 0, border=False)
                for line in LUA_CONSOLE_OUTPUT:
                    if "LUA ERROR" in line:
                        imgui.text_colored(line, 1.0, 0.3, 0.3, 1.0)
                    elif "[!]" in line:
                        imgui.text_colored(line, 1.0, 0.8, 0.1, 1.0) # Yellow for warnings
                    elif "[+]" in line:
                        imgui.text_colored(line, 0.3, 1.0, 0.3, 1.0)
                    elif "[>]" in line:
                        imgui.text_colored(line, 0.3, 0.7, 1.0, 1.0)
                    else:
                        imgui.text_wrapped(line)
                if not LUA_CONSOLE_OUTPUT:
                    imgui.text_disabled(" No output yet. Run a script to see logs.")
                imgui.set_scroll_here_y(1.0)
                imgui.end_child()
                imgui.end_child()
                
                # Execution Controls
                imgui.dummy(0, 10)
                imgui.columns(2, "lua_ctrls", border=False)
                if LUA_IS_RUNNING:
                    render_glowing_pill_button("SCRIPT RUNNING...", -1, 45, color_override=[0.5, 0.2, 0.2, 1.0])
                else:
                    if render_glowing_pill_button("EXECUTE SCRIPT", -1, 45):
                        threading.Thread(target=run_lua_script_thread, args=(LUA_SCRIPT_TEXT, mem), daemon=True).start()
                        ACTIVE_NOTIFICATIONS.append(GlyconNotification("Script Execution Started", category="Lua"))
                
                imgui.next_column()
                if render_styled_button("LOAD EXAMPLE SCRIPT", -1, 45):
                    LUA_SCRIPT_TEXT = """-- JumpPower Changer Script
-- Modifies the local player's JumpPower property

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

-- Configuration
local TARGET_JUMPPOWER = 100  -- Change this value (default is 50)
local UPDATE_INTERVAL = 0.1  -- How often to apply the change

print("[+] JumpPower Changer Loading...")

local function getHumanoid()
    local character = LocalPlayer.Character
    if character then
        return character:FindFirstChild("Humanoid")
    end
    return nil
end

local function setJumpPower(value)
    local humanoid = getHumanoid()
    if humanoid then
        humanoid.JumpPower = value
        humanoid.JumpHeight = value * 0.5  -- Also set JumpHeight for R15 characters
        return true
    end
    return false
end

-- Initial application
if setJumpPower(TARGET_JUMPPOWER) then
    print("[+] JumpPower set to: " .. TARGET_JUMPPOWER)
else
    print("[!] Waiting for character to load...")
end

-- Character respawn handler
LocalPlayer.CharacterAdded:Connect(function(char)
    -- Wait for humanoid to load
    local humanoid = char:WaitForChild("Humanoid", 10)
    if humanoid then
        wait(0.5)  -- Small delay for full load
        humanoid.JumpPower = TARGET_JUMPPOWER
        humanoid.JumpHeight = TARGET_JUMPPOWER * 0.5
        print("[+] JumpPower reapplied after respawn: " .. TARGET_JUMPPOWER)
    end
end)

-- Continuous loop to maintain JumpPower (bypasses resets)
spawn(function()
    while wait(UPDATE_INTERVAL) do
        pcall(function()
            setJumpPower(TARGET_JUMPPOWER)
        end)
    end
end)

print("[+] JumpPower Changer Active!")
print("[>] Current Value: " .. TARGET_JUMPPOWER)
print("[>] Modify TARGET_JUMPPOWER variable to change value")"""
                    ACTIVE_NOTIFICATIONS.append(GlyconNotification("JumpPower Script Loaded", category="Lua"))
                imgui.columns(1)
                
                imgui.pop_style_var()
                imgui.end_child()
            elif CURRENT_TAB == "AI":
                if not AI_TERMS_ACCEPTED:
                    imgui.begin_child("Terms", 0, 0, border=True)
                    
                    # AI Logo Header
                    ai_tex = ICON_TEXTURES.get("AI")
                    if ai_tex:
                        imgui.set_cursor_pos_x(imgui.get_window_width() / 2 - 32)
                        imgui.image(ai_tex, 64, 64)
                        imgui.dummy(0, 10)

                    imgui.set_window_font_scale(1.2)
                    imgui.text_wrapped("GLYCON AI ASSISTANT - TERMS OF SERVICE")
                    imgui.set_window_font_scale(1.0)
                    imgui.separator()
                    imgui.dummy(0, 10)
                    imgui.text_wrapped("By using the AI Assistant, you acknowledge and agree that your text conversations may be collected and processed to improve the underlying AI model and user experience.")
                    imgui.dummy(0, 10)
                    imgui.text_wrapped("This feature is still in BETA and might face bugs especially with features.")
                    imgui.dummy(0, 20)
                    if render_styled_button("I ACCEPT THESE TERMS", -1, 45):
                        AI_TERMS_ACCEPTED = True
                    if render_styled_button("DECLINE", -1, 30):
                        CURRENT_TAB = "AIM"
                    
                    imgui.dummy(0, 15)
                    imgui.begin_child("AI_Info", 0, 0, border=True)
                    imgui.text_colored("HOW TO USE GLYCON AI", 0.54, 0.17, 0.89, 1.0)
                    imgui.separator()
                    imgui.text_wrapped("- Ask for configurations: 'Give me a blatant config' or 'Streamable settings'.")
                    imgui.text_wrapped("- Toggle features: 'Turn on aimbot' or 'Disable ESP'.")
                    imgui.text_wrapped("- Set specific values: 'Set FOV to 150' or 'Smoothness 5'.")
                    imgui.text_wrapped("- It's your personal assistant, feel free to ask about any cheat feature.")
                    imgui.end_child()
                    
                    imgui.end_child()
                else:
                    # Chat Interface - Premium Design
                    imgui.begin_child("ChatArea", 0, -65, border=False)
                    ai_chat_draw_list = imgui.get_window_draw_list()
                    
                    # Store current message count to handle auto-scrolling better
                    for m in AI_MESSAGES:
                        is_user = m["role"] == "user"
                        raw_content = m["content"]
                        # Filter out internal command tags for display
                        display_content = re.sub(r"\[CMD:[^\]]+\]", "", raw_content).strip()
                        if not display_content and not is_user:
                            if "[CMD:" in raw_content:
                                display_content = "Changes applied successfully. ✅"
                            else: continue
                        
                        imgui.begin_group()
                        pfp_size = 36
                        start_cursor = imgui.get_cursor_pos()
                        start_screen = imgui.get_cursor_screen_pos()
                        
                        # --- Avatar Rendering ---
                        avatar_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.9) if not is_user else imgui.get_color_u32_rgba(0.2, 0.6, 1.0, 0.9)
                        # Shadow/Outer Ring
                        ai_chat_draw_list.add_circle_filled(start_screen.x + pfp_size/2, start_screen.y + pfp_size/2, pfp_size/2 + 2, imgui.get_color_u32_rgba(0,0,0,0.3))
                        ai_chat_draw_list.add_circle(start_screen.x + pfp_size/2, start_screen.y + pfp_size/2, pfp_size/2, avatar_col, thickness=1.5)
                        
                        tex_to_draw = AVATAR_TEXTURE if is_user else ICON_TEXTURES.get("AI")
                        if tex_to_draw:
                             ai_chat_draw_list.add_image(tex_to_draw, (start_screen.x, start_screen.y), (start_screen.x + pfp_size, start_screen.y + pfp_size), (0,0), (1,1))
                        else:
                             # Fallback icon if texture fails
                             txt = "U" if is_user else "G"
                             atw, ath = imgui.calc_text_size(txt)
                             ai_chat_draw_list.add_text(start_screen.x + (pfp_size-atw)/2, start_screen.y + (pfp_size-ath)/2, 0xFFFFFFFF, txt)

                        # --- Bubble Geometry Calculations ---
                        # We use 75% of the window width for messages
                        max_bubble_width = imgui.get_window_width() * 0.75
                        inner_pad_x, inner_pad_y = 16, 12
                        
                        author_name = LOCAL_PLAYER_INFO.get("name", "Local User")
                        if not author_name or author_name == "Unknown": author_name = "Local User"
                        author_name = author_name.upper() if is_user else "GLYCON AI"
                        author_col = [0.35, 0.65, 1.0, 1.0] if is_user else [0.65, 0.35, 1.0, 1.0]
                        hw, hh = imgui.calc_text_size(author_name)
                        
                        # Calculate text wrapping based on bubble constraints
                        text_available_width = max_bubble_width - (inner_pad_x * 2)
                        tw, th = imgui.calc_text_size(display_content, wrap_width=text_available_width)
                        
                        bubble_w = max(hw, tw) + (inner_pad_x * 2)
                        bubble_h = hh + th + (inner_pad_y * 2) + 16 # Increased bottom padding for visual balance
                        
                        bx = start_screen.x + pfp_size + 12
                        by = start_screen.y - 4
                        
                        # 1. Subtle Glow Background
                        glow_color = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.08) if not is_user else imgui.get_color_u32_rgba(0.2, 0.6, 1.0, 0.08)
                        for i in range(1, 4):
                             ai_chat_draw_list.add_rect(bx - i, by - i, bx + bubble_w + i, by + bubble_h + i, glow_color, 12.0, thickness=1.0)

                        # 2. Main Background
                        bg_col = imgui.get_color_u32_rgba(0.08, 0.08, 0.10, 0.98)
                        ai_chat_draw_list.add_rect_filled(bx, by, bx + bubble_w, by + bubble_h, bg_col, 12.0)
                        
                        # 3. Message Border
                        border_col = imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.35) if not is_user else imgui.get_color_u32_rgba(0.2, 0.6, 1.0, 0.3)
                        ai_chat_draw_list.add_rect(bx, by, bx + bubble_w, by + bubble_h, border_col, 12.0, thickness=1.2)
                        
                        # --- Drawing Chat Content ---
                        text_x_pos = start_cursor.x + pfp_size + 12 + inner_pad_x
                        
                        # Author Label
                        imgui.set_cursor_pos(imgui.Vec2(text_x_pos, start_cursor.y + inner_pad_y - 4))
                        imgui.text_colored(author_name, *author_col)
                        
                        # Message Text with proper wrapping
                        imgui.set_cursor_pos(imgui.Vec2(text_x_pos, imgui.get_cursor_pos_y() + 6))
                        # FIX: Use correct local wrap position (X current + available width)
                        imgui.push_text_wrap_pos(imgui.get_cursor_pos_x() + text_available_width)
                        imgui.text(display_content)
                        imgui.pop_text_wrap_pos()
                        
                        # Move cursor down for next message with spacing
                        imgui.set_cursor_pos(imgui.Vec2(start_cursor.x, start_cursor.y + max(pfp_size, bubble_h) + 20))
                        imgui.end_group()

                    if AI_BUSY:
                        imgui.dummy(0, 5)
                        imgui.text_colored(" Glycon is processing your request... ⌛", 0.54, 0.17, 0.89, 0.7)
                    
                    # Auto-scroll to bottom
                    if imgui.get_scroll_y() >= imgui.get_scroll_max_y() - 50:
                        imgui.set_scroll_here_y(1.0)
                    
                    imgui.dummy(0, 20)
                    imgui.end_child()
                    
                    # --- Input Area ---
                    imgui.push_style_var(imgui.STYLE_CHILD_ROUNDING, 8.0)
                    imgui.begin_child("InputArea", 0, 55, border=True)
                    imgui.set_cursor_pos(imgui.Vec2(10, 12))
                    imgui.push_item_width(-110)
                    # Enter key triggers send
                    changed, AI_INPUT = imgui.input_text("##chat_input", AI_INPUT, 1024, imgui.INPUT_TEXT_ENTER_RETURNS_TRUE)
                    if changed and not AI_BUSY:
                        send_ai_chat()
                    imgui.pop_item_width()
                    
                    imgui.same_line()
                    imgui.set_cursor_pos_y(10)
                    if render_styled_button("SEND", 90, 32) and not AI_BUSY:
                        send_ai_chat()
                    imgui.end_child()
                    imgui.pop_style_var()
            elif CURRENT_TAB == "ADDICT":
                imgui.begin_child("AddictMain", 0, 0, border=False)
                
                # Setup column layout for better organization
                imgui.columns(2, "addict_main_cols", border=False)
                
                # --- Left Side: Stability & Physics ---
                imgui.begin_child("AddictLeft", 0, -5, border=True)
                imgui.push_style_var(imgui.STYLE_ITEM_SPACING, imgui.Vec2(8, 12))
                
                # Header 1
                imgui.text_colored("STABILITY & DEFENSE", 0.54, 0.17, 0.89, 1.0)
                imgui.push_style_color(imgui.COLOR_SEPARATOR, 0.54, 0.17, 0.89, 0.3)
                imgui.separator()
                imgui.pop_style_color()
                
                # Anti-Stomp
                with imgui.begin_group():
                    _, ADDICT_ANTI_STOMP_ENABLED = render_styled_checkbox("Anti-Stomp System", ADDICT_ANTI_STOMP_ENABLED)
                    imgui.text_disabled("  Protects against character stomping/executions.")
                    if ADDICT_ANTI_STOMP_ENABLED:
                        imgui.indent(12)
                        imgui.push_item_width(-20)
                        _, ADDICT_ANTI_STOMP_THRESHOLD = imgui.slider_float("##stomp_th", ADDICT_ANTI_STOMP_THRESHOLD, 1.0, 50.0, "Reset Threshold: %.1f%% HP")
                        imgui.pop_item_width()
                        imgui.unindent(12)
                
                # Anti-Slow
                with imgui.begin_group():
                    _, ADDICT_ANTI_SLOW_ENABLED = render_styled_checkbox("Anti-Slow Engine", ADDICT_ANTI_SLOW_ENABLED)
                    imgui.text_disabled("  Bypasses movement speed debuffs and stuns.")
                    if ADDICT_ANTI_SLOW_ENABLED:
                        imgui.indent(12)
                        imgui.push_item_width(-20)
                        _, ADDICT_ANTI_SLOW_SPEED = imgui.slider_float("##slow_speed", ADDICT_ANTI_SLOW_SPEED, 1.0, 100.0, "Target Velocity: %.1f")
                        imgui.pop_item_width()
                        imgui.unindent(12)
                
                # Instant Fall
                with imgui.begin_group():
                    _, ADDICT_INSTANT_FALL_ENABLED = render_styled_checkbox("Instant Fall Physics", ADDICT_INSTANT_FALL_ENABLED)
                    imgui.text_disabled("  Removes jump curve for immediate landings.")
                
                imgui.pop_style_var()
                imgui.end_child()
                
                imgui.next_column()
                
                # --- Right Side: Models & Combat ---
                imgui.begin_child("AddictRight", 0, -5, border=True)
                imgui.push_style_var(imgui.STYLE_ITEM_SPACING, imgui.Vec2(8, 12))
                
                # Header 2
                imgui.text_colored("CUSTOM MODELS & COMBAT", 0.54, 0.17, 0.89, 1.0)
                imgui.push_style_color(imgui.COLOR_SEPARATOR, 0.54, 0.17, 0.89, 0.3)
                imgui.separator()
                imgui.pop_style_color()
                
                # Animation Hub
                with imgui.begin_group():
                    _, ADDICT_ANIMATION_ENABLED = render_styled_checkbox("Animation Hub", ADDICT_ANIMATION_ENABLED)
                    imgui.text_disabled("  Granular local character animation packs.")
                    if ADDICT_ANIMATION_ENABLED:
                        imgui.indent(12)
                        imgui.push_item_width(-20)
                        
                        for anim_type in ANIM_TYPE_SELECTIONS:
                            imgui.text_disabled(f"  {anim_type.upper()}")
                            changed, index = imgui.combo(f"##anim_{anim_type}", ANIM_TYPE_SELECTIONS[anim_type], ANIMATION_PACKS)
                            if changed:
                                ANIM_TYPE_SELECTIONS[anim_type] = index
                        
                        imgui.pop_item_width()
                        imgui.unindent(12)
                
                imgui.pop_style_var()
                imgui.end_child()
                
                imgui.columns(1)
                imgui.end_child()
            elif CURRENT_TAB == "RAGE":
                imgui.begin_child("RageMain", 0, 0, border=False)
                imgui.begin_child("RageOrbitPanel", 0, 250, border=True)
                imgui.push_style_var(imgui.STYLE_ITEM_SPACING, imgui.Vec2(8, 12))
                
                imgui.text_colored(" RAGE ORBIT ENGINE", 0.54, 0.17, 0.89, 1.0)
                imgui.push_style_color(imgui.COLOR_SEPARATOR, 0.54, 0.17, 0.89, 0.3)
                imgui.separator()
                imgui.pop_style_color()
                
                imgui.text_disabled("  High-speed orbit targeting system.")
                imgui.dummy(0, 5)

                rage_key_lbl = format_key(ADDICT_RAGE_KEY) if not WAITING_FOR_ADDICT_RAGE_KEY else "[ ... ]"
                
                imgui.columns(2, "rage_ctrls", border=False)
                imgui.text("Activation Key")
                if render_styled_button(f"{rage_key_lbl}##rage_k", -1, 30): WAITING_FOR_ADDICT_RAGE_KEY = True
                
                imgui.next_column()
                _, ADDICT_RAGE_ENABLED = render_styled_checkbox("Enable Orbit", ADDICT_RAGE_ENABLED)
                imgui.columns(1)
                
                if ADDICT_RAGE_ENABLED:
                    imgui.separator(); imgui.dummy(0, 5)
                    imgui.indent(12)
                    
                    mode_text = "HOLD MODE" if ADDICT_RAGE_MODE == 0 else "TOGGLE MODE"
                    if render_styled_button(f"MODE: {mode_text}", -1, 35):
                        ADDICT_RAGE_MODE = 1 if ADDICT_RAGE_MODE == 0 else 0
                    
                    imgui.dummy(0, 10)
                    _, ADDICT_RAGE_ORBIT_RADIUS = imgui.slider_float("Orbit Radius", ADDICT_RAGE_ORBIT_RADIUS, 3.0, 30.0, "%.1f studs")
                    if _: perform_security_check()
                    
                    _, ADDICT_RAGE_ORBIT_SPEED = imgui.slider_float("Rotation Speed", ADDICT_RAGE_ORBIT_SPEED, 1.0, 40.0, "%.1f rot/s")
                    if _: perform_security_check()
                    
                    _, ADDICT_RAGE_ORBIT_HEIGHT = imgui.slider_float("Orbit Height Offset", ADDICT_RAGE_ORBIT_HEIGHT, -10.0, 20.0, "%.1f studs")
                    if _: perform_security_check()
                    
                    imgui.unindent(12)
                
                imgui.pop_style_var()
                imgui.end_child()
                
                # Kill All Panel
                imgui.dummy(0, 10)
                imgui.begin_child("KillAllPanel", 0, 320, border=True)
                imgui.push_style_var(imgui.STYLE_ITEM_SPACING, imgui.Vec2(8, 12))
                
                imgui.text_colored(" KILL ALL SYSTEM", 0.54, 0.17, 0.89, 1.0)
                imgui.text_disabled("  Auto-orbit and eliminate all players sequentially.")
                imgui.dummy(0, 5)
                
                _, KILL_ALL_ENABLED = render_styled_checkbox("Enable Kill All", KILL_ALL_ENABLED)
                
                if KILL_ALL_ENABLED:
                    imgui.dummy(0, 5)
                    imgui.indent(12)
                    
                    _, KILL_ALL_HEALTH_THRESHOLD = imgui.slider_float("Target Switch Threshold", KILL_ALL_HEALTH_THRESHOLD, 0.5, 10.0, "%.1f%% HP")
                    imgui.text_disabled("  Switches to next target when current reaches this HP%")
                    
                    imgui.dummy(0, 8)
                    imgui.text_disabled("ORBIT CONFIGURATION")
                    imgui.push_item_width(-20)
                    _, KILL_ALL_ORBIT_RADIUS = imgui.slider_float("Orbit Radius##ka_rad", KILL_ALL_ORBIT_RADIUS, 3.0, 30.0, "%.1f studs")
                    _, KILL_ALL_ORBIT_SPEED = imgui.slider_float("Rotation Speed##ka_spd", KILL_ALL_ORBIT_SPEED, 1.0, 40.0, "%.1f rot/s")
                    _, KILL_ALL_ORBIT_HEIGHT = imgui.slider_float("Orbit Height Offset##ka_hgt", KILL_ALL_ORBIT_HEIGHT, -10.0, 20.0, "%.1f studs")
                    imgui.pop_item_width()

                    imgui.dummy(0, 10)
                    if KILL_ALL_TARGET_ADDR != 0:
                        imgui.text_colored("STATUS: ACTIVE - Targeting player", 0.2, 1.0, 0.2, 1.0)
                        imgui.text_colored("  Auto-clicking active", 1.0, 0.8, 0.0, 1.0)
                    else:
                        imgui.text_colored("STATUS: IDLE - Searching for targets", 0.8, 0.8, 0.8, 1.0)
                    
                    imgui.unindent(12)
                
                imgui.pop_style_var()
                imgui.end_child()
                imgui.end_child()
            imgui.end_child(); imgui.pop_style_var(2); imgui.end()
        l_pos_prim = LOCAL_PLAYER_INFO["pos_prim"]
        my_pos = vec3(*struct.unpack('fff', mem.read_mem(l_pos_prim + O_POSITION, 12))) if l_pos_prim else vec3(0,0,0)
        hum = LOCAL_PLAYER_INFO["hum"]
        l_hrp_node = LOCAL_PLAYER_INFO["hrp_node"]
        my_team = LOCAL_PLAYER_INFO["team"]
        if LOCAL_PLAYER_INFO["userId"] != 0 and AVATAR_FETCH_STATUS == "IDLE":
            AVATAR_FETCH_STATUS = "FETCHING"
            threading.Thread(target=fetch_avatar_thread, args=(LOCAL_PLAYER_INFO["userId"],), daemon=True).start()
        if AVATAR_FETCH_STATUS == "READY" and AVATAR_IMAGE_DATA:
            try:
                width, height = AVATAR_IMAGE_DATA.size
                img_raw = AVATAR_IMAGE_DATA.tobytes("raw", "RGBA", 0, -1)
                tex_id = gl.glGenTextures(1)
                gl.glBindTexture(gl.GL_TEXTURE_2D, tex_id)
                gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, width, height, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, img_raw)
                AVATAR_TEXTURE = tex_id
                AVATAR_FETCH_STATUS = "LOADED"
                AVATAR_IMAGE_DATA = None
            except: AVATAR_FETCH_STATUS = "FAILED"
        if mem.base_address and FFLAG_DESYNC_ADDR == 0:
             FFLAG_DESYNC_ADDR = find_fflag_addr(mem, "NextGenReplicatorEnabledWrite4")
        if FFLAG_DESYNC_ADDR != 0:
             mem.write_mem(FFLAG_DESYNC_ADDR, struct.pack('b', 1 if SS_DESYNC_ENABLED else 0))
        try:
            if l_pos_prim and CLICK_TP_ENABLED and not MENU_OPEN:
                if (win32api.GetAsyncKeyState(win32con.VK_CONTROL) & 0x8000) and (win32api.GetAsyncKeyState(0x01) & 1):
                    p_mouse = mem.read_ptr(mem.local_player + O_PLAYER_MOUSE)
                    t_vec = None
                    for ptr in [p_mouse, mem.mouse_service]:
                        if not ptr: continue
                        raw = mem.read_mem(ptr + O_MOUSE_HIT_POS, 12)
                        if len(raw) == 12:
                            dat = struct.unpack('fff', raw)
                            if abs(dat[0]) > 0.1 or abs(dat[2]) > 0.1:
                                t_vec = dat
                                break
                    if t_vec:
                        new_p_data = struct.pack('fff', t_vec[0], t_vec[1] + 5.0, t_vec[2])
                        zero_v_data = struct.pack('fff', 0.0, 0.0, 0.0)
                        for _ in range(40):
                            mem.write_mem(l_pos_prim + O_POSITION, new_p_data)
                            mem.write_mem(l_pos_prim + O_VELOCITY, zero_v_data)
            if l_pos_prim and TOGGLE_INF_JUMP:
                if win32api.GetAsyncKeyState(win32con.VK_SPACE) & 0x8000:
                    mem.write_mem(l_pos_prim + O_VELOCITY + 4, struct.pack('f', 50.0))
            if l_pos_prim and NO_JUMP_COOLDOWN_ENABLED:
                try:
                    if win32api.GetAsyncKeyState(win32con.VK_SPACE) & 1:
                        state_machine = mem.read_ptr(hum + O_HUMANOID_STATE)
                        if state_machine:
                            current_state = struct.unpack('B', mem.read_mem(state_machine + O_HUMANOID_STATE_ID, 1))[0]
                            if current_state in [8, 10, 12, 13]:
                                current_vel_y = struct.unpack('f', mem.read_mem(l_pos_prim + O_VELOCITY + 4, 4))[0]
                                if abs(current_vel_y) < 0.5:
                                    mem.write_mem(l_pos_prim + O_VELOCITY + 4, struct.pack('f', 50.0))
                                    mem.write_mem(state_machine + O_HUMANOID_STATE_ID, b'\x03')
                                    LAST_JUMP_T = time.time()
                except: pass
            if l_pos_prim and TOGGLE_FLY:
                cam = mem.read_ptr(mem.workspace + O_CAMERA)
                if cam:
                    cam_rot_raw = mem.read_mem(cam + O_CAMERA_ROT, 36)
                    r = struct.unpack('9f', cam_rot_raw)
                    right_v = vec3(r[0], r[3], r[6]); look_v = vec3(-r[2], -r[5], -r[8])
                    move_vec = vec3(0, 0, 0)
                    if win32api.GetAsyncKeyState(0x57) & 0x8000: move_vec.x += look_v.x; move_vec.y += look_v.y; move_vec.z += look_v.z
                    if win32api.GetAsyncKeyState(0x53) & 0x8000: move_vec.x -= look_v.x; move_vec.y -= look_v.y; move_vec.z -= look_v.z
                    if win32api.GetAsyncKeyState(0x44) & 0x8000: move_vec.x += right_v.x; move_vec.y += right_v.y; move_vec.z += right_v.z
                    if win32api.GetAsyncKeyState(0x41) & 0x8000: move_vec.x -= right_v.x; move_vec.y -= right_v.y; move_vec.z -= right_v.z
                    if win32api.GetAsyncKeyState(0x20) & 0x8000: move_vec.y += 1.0
                    if win32api.GetAsyncKeyState(0xA0) & 0x8000: move_vec.y -= 1.0
                    mag = math.sqrt(move_vec.x**2 + move_vec.y**2 + move_vec.z**2)
                    if mag > 0:
                        v_scale = FLY_SPEED * 50.0
                        mem.write_mem(l_pos_prim + O_VELOCITY, struct.pack('fff', (move_vec.x / mag) * v_scale, (move_vec.y / mag) * v_scale, (move_vec.z / mag) * v_scale))
                    else: mem.write_mem(l_pos_prim + O_VELOCITY, struct.pack('fff', 0, 0, 0))
            if hum:
                if TOGGLE_HH: mem.write_mem(hum + O_HIP_HEIGHT, struct.pack('f', HIPHEIGHT_VAL))
                if NO_JUMP_COOLDOWN_ENABLED:
                    state_machine = mem.read_ptr(hum + O_HUMANOID_STATE)
                    if state_machine:
                        current_state = struct.unpack('B', mem.read_mem(state_machine + O_HUMANOID_STATE_ID, 1))[0]
                        if current_state in [13, 14, 15, 16]:
                            mem.write_mem(state_machine + O_HUMANOID_STATE_ID, b'\x08')
                    jp_val = struct.unpack('f', mem.read_mem(hum + O_JUMP_POWER, 4))[0]
                    if jp_val < 1.0:
                        mem.write_mem(hum + O_JUMP_POWER, struct.pack('f', 50.0))
            if TOGGLE_GRAVITY: mem.write_gravity(GRAVITY_VAL)
            if TOGGLE_TIME and mem.lighting: mem.write_mem(mem.lighting + O_CLOCK_TIME, struct.pack('f', TIME_VAL))
            if TOGGLE_FOG and mem.lighting:
                 mem.write_mem(mem.lighting + O_FOG_START, struct.pack('f', FOG_START_VAL))
                 mem.write_mem(mem.lighting + O_FOG_END, struct.pack('f', FOG_END_VAL))
            if TOGGLE_TICK_RATE and mem.workspace:
                w_ptr = mem.read_ptr(mem.workspace + O_WORKSPACE_TO_WORLD)
                if w_ptr: mem.write_mem(w_ptr + O_TICK_RATE, struct.pack('f', TICK_RATE_VAL))
            if TOGGLE_FOG_HUE and mem.lighting: mem.write_mem(mem.lighting + O_FOG_COLOR, struct.pack('fff', *FOG_HUE_COLOR))
            if TOGGLE_FOV_MOD:
                cam = mem.read_ptr(mem.workspace + O_CAMERA)
                if cam: mem.write_mem(cam + O_FOV, struct.pack('f', FOV_VAL))
            
            # === ADDICT FEATURES ===
            # Anti-Stomp: Reset character when health is too low
            if ADDICT_ANTI_STOMP_ENABLED and hum:
                hp = LOCAL_PLAYER_INFO.get("hp", 100)
                m_hp = LOCAL_PLAYER_INFO.get("m_hp", 100)
                if m_hp > 0:
                    hp_percent = (hp / m_hp) * 100
                    if hp_percent <= ADDICT_ANTI_STOMP_THRESHOLD and hp > 0:
                        # Kill character directly
                        mem.write_mem(hum + O_HEALTH, struct.pack('f', 0.0))
            
            # Anti-Slow: Loop walkspeed to bypass slow effects
            if ADDICT_ANTI_SLOW_ENABLED and hum:
                mem.write_mem(hum + O_WALKSPEED, struct.pack('f', ADDICT_ANTI_SLOW_SPEED))
                mem.write_mem(hum + O_WALKSPEED_CHECK, struct.pack('f', ADDICT_ANTI_SLOW_SPEED))
            
            # Instant Fall: Zero out Y velocity when jumping to fall instantly
            if ADDICT_INSTANT_FALL_ENABLED and l_pos_prim:
                vel_raw = mem.read_mem(l_pos_prim + O_VELOCITY, 12)
                if vel_raw:
                    vx, vy, vz = struct.unpack('fff', vel_raw)
                    if vy < -0.5:  # Only when going down (falling)
                        # Set Y velocity to a large negative value to fall instantly
                        mem.write_mem(l_pos_prim + O_VELOCITY, struct.pack('fff', vx, -200.0, vz))
            
            # Animation Hub: Granularly overwrite character animations
            if ADDICT_ANIMATION_ENABLED and (l_char or LOCAL_PLAYER_INFO.get('char')):
                try:
                    char = l_char if l_char else LOCAL_PLAYER_INFO['char']
                    hum = LOCAL_PLAYER_INFO.get('hum')
                    
                    # Expanded keyword map for diverse games
                    type_keywords = {
                        "Idle": ["idle", "wait", "look", "station", "pose"],
                        "Run": ["run", "sprint", "fast", "dash"],
                        "Walk": ["walk", "strut", "move"],
                        "Jump": ["jump", "leap", "air"],
                        "Fall": ["fall", "drop", "down"],
                        "Climb": ["climb", "ladder"],
                        "Swim": ["swim", "float", "water"],
                        "Swim (Idle)": ["swimidle", "swim_idle", "swimwait"]
                    }
                    
                    def find_all_animations(parent, depth=0):
                        if depth > 12: return [] # Extreme depth
                        found = []
                        for child in mem.get_children(parent):
                            cls = mem.get_class_name(child).lower()
                            if "animation" in cls or "value" in cls: found.append(child)
                            found.extend(find_all_animations(child, depth + 1))
                        return found

                    all_anims = find_all_animations(char)
                    for anim_obj in all_anims:
                        # Check multiple ancestors for categorization
                        ancestors = []
                        curr_p = mem.read_ptr(anim_obj + O_PARENT)
                        for _ in range(3): # Check up to 3 levels up
                            if not curr_p: break
                            n_ptr = mem.read_ptr(curr_p + O_NAME)
                            if n_ptr: ancestors.append(mem.read_str(n_ptr).lower())
                            curr_p = mem.read_ptr(curr_p + O_PARENT)
                        
                        for anim_type, sel_idx in ANIM_TYPE_SELECTIONS.items():
                            if sel_idx == 0: continue
                            pack_ids = ANIMATION_HUB.get(ANIMATION_PACKS[sel_idx], {}).get(anim_type.replace(" ", "").replace("(","").replace(")",""), [])
                            if not pack_ids: continue
                            
                            # Categorize if ANY ancestor matches keywords
                            if any(kw in "/".join(ancestors) for kw in type_keywords.get(anim_type, [])):
                                on_ptr = mem.read_ptr(anim_obj + O_NAME)
                                o_name = mem.read_str(on_ptr).lower() if on_ptr else ""
                                idx = 1 if "2" in o_name else (2 if "3" in o_name else 0)
                                if idx >= len(pack_ids): idx = 0
                                target_id = f"rbxassetid://{pack_ids[idx]}"
                                
                                # Discovery loop for property target
                                target_prop = 0
                                for off in [0xD0, 0xD8, 0xE0, 0xF0, 0x100]: # Check likely offsets first
                                    ptr = mem.read_ptr(anim_obj + off)
                                    if ptr > 0x1000:
                                        try:
                                            s = mem.read_str(ptr)
                                            if "rbxassetid://" in s or s == "": target_prop = ptr; break
                                        except: pass
                                    try:
                                        s = mem.read_str(anim_obj + off)
                                        if "rbxassetid://" in s: target_prop = anim_obj + off; break
                                    except: pass
                                
                                if target_prop:
                                    if mem.write_str(target_prop, target_id):
                                        # State nudge and track reset
                                        if hum:
                                            st_ptr = mem.read_ptr(hum + 0x8D8)
                                            if st_ptr > 0x1000: mem.write_mem(st_ptr + 0x20, b'\x04')
                except: pass
        except: pass
        is_key_down = bool(win32api.GetAsyncKeyState(AIM_KEY) & 0x8000)
        if AIM_MODE == "Hold": is_aiming = is_key_down
        else:
            if is_key_down and not LAST_AIM_KEY_STATE: AIM_TOGGLE_STATE = not AIM_TOGGLE_STATE
            is_aiming = AIM_TOGGLE_STATE
        LAST_AIM_KEY_STATE = is_key_down
        best_target, best_target_3d, min_dist_3d, cur_lock_id = None, None, float('inf'), 0
        try:
            vm_raw = mem.read_mem(mem.visual_engine + O_VIEW_MATRIX, 64)
            vm = struct.unpack('16f', vm_raw)
        except:
            vm = [0.0]*16
        cam_angle = math.atan2(vm[2], vm[0])
        def w2s_scr(pos):
            res = mem.world_to_screen(pos, vm, client_w, client_h)
            if res.x != -1: return vec2(res.x + off_x, res.y + off_y)
            return res
        if SHOW_RADAR:
            scale = (RADAR_SIZE / 2) / RADAR_RANGE
            for ox, oz, otype in RADAR_DECORATIONS:
                rx = ox * math.cos(cam_angle) + oz * math.sin(cam_angle)
                ry = oz * math.cos(cam_angle) - ox * math.sin(cam_angle)
                fx, fy = (off_x + RADAR_X + RADAR_SIZE/2) + (rx * scale), (off_y + RADAR_Y + RADAR_SIZE/2) + (ry * scale)
                if (off_x + RADAR_X) < fx < (off_x + RADAR_X + RADAR_SIZE) and (off_y + RADAR_Y) < fy < (off_y + RADAR_Y + RADAR_SIZE):
                    if otype == "TREE": draw_list.add_triangle_filled(fx, fy-4, fx-3, fy+3, fx+3, fy+3, 0x66225522)
                    else: draw_list.add_circle_filled(fx, fy, 1.5, 0x66FFFFFF)
        if not is_aiming: LOCKED_PLAYER_ADDR = 0; MOUSE_ACCUM_X = MOUSE_ACCUM_Y = 0.0
        # === Advanced Interaction Logic ===
        active_interaction = False
        if l_pos_prim:
            # 3. Jumpscare (Highest priority)
            if JUMPSCARE_TARGET_ADDR != 0:
                elapsed = time.time() - JUMPSCARE_START_TIME
                if elapsed < 3.0:
                    with CACHE_LOCK:
                        target = next((p for p in PLAYER_CACHE if p['ptr'] == JUMPSCARE_TARGET_ADDR), None)
                        if target and target['hp'] > 0 and target['hrp_prim']:
                            active_interaction = True
                            if JUMPSCARE_ORIG_POS is None:
                                JUMPSCARE_ORIG_POS = mem.read_mem(l_pos_prim + O_POSITION, 12)
                            
                            tp_raw = mem.read_mem(target['hrp_prim'] + O_POSITION, 12)
                            if tp_raw:
                                tpx, tpy, tpz = struct.unpack('fff', tp_raw)
                                # Teleport right in front of them
                                jump_pos = struct.pack('fff', tpx + 2, tpy, tpz + 2)
                                for _ in range(15):
                                    mem.write_mem(l_pos_prim + O_POSITION, jump_pos)
                                    mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00' * 12)
                        else:
                            JUMPSCARE_TARGET_ADDR = 0
                else:
                    # Return to original position
                    if JUMPSCARE_ORIG_POS:
                        for _ in range(25):
                            mem.write_mem(l_pos_prim + O_POSITION, JUMPSCARE_ORIG_POS)
                    JUMPSCARE_TARGET_ADDR = 0
                    JUMPSCARE_ORIG_POS = None

            # 2. Fling
            if not active_interaction and FLING_TARGET_ADDR != 0:
                with CACHE_LOCK:
                    target = next((p for p in PLAYER_CACHE if p['ptr'] == FLING_TARGET_ADDR), None)
                    if target and target['hp'] > 0 and target['hrp_prim']:
                        active_interaction = True
                        tp_raw = mem.read_mem(target['hrp_prim'] + O_POSITION, 12)
                        if tp_raw:
                            tpx, tpy, tpz = struct.unpack('fff', tp_raw)
                            # Create high-speed spinning velocity for fling
                            fling_speed = 100000.0
                            angle = time.time() * 60
                            vx = math.cos(angle) * fling_speed
                            vz = math.sin(angle) * fling_speed
                            
                            # Orbit tightly around target to collide
                            nx = tpx + math.cos(angle) * 1.5
                            nz = tpz + math.sin(angle) * 1.5
                            
                            pos_data = struct.pack('fff', nx, tpy, nz)
                            vel_data = struct.pack('fff', vx, 2500.0, vz) # Add some Y lift
                            for _ in range(15):
                                mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                mem.write_mem(l_pos_prim + O_VELOCITY, vel_data)
                    else:
                        FLING_TARGET_ADDR = 0

            # 1.5 Stay Behind
            if not active_interaction and STAY_BEHIND_TARGET_ADDR != 0:
                with CACHE_LOCK:
                    target = next((p for p in PLAYER_CACHE if p['ptr'] == STAY_BEHIND_TARGET_ADDR), None)
                    if target and target['hp'] > 0 and target['hrp_prim']:
                        active_interaction = True
                        tp_raw = mem.read_mem(target['hrp_prim'] + O_POSITION, 12)
                        tr_raw = mem.read_mem(target['hrp_prim'] + O_CFRAME, 36) # Corrected to O_CFRAME (0xC0)
                        if tp_raw and len(tr_raw) == 36:
                            t_pos = struct.unpack('fff', tp_raw)
                            tr = struct.unpack('9f', tr_raw)
                            # Column 3 (BackVector) of a 3x3 rotation matrix
                            bx, by, bz = tr[2], tr[5], tr[8]
                            
                            # Stay 3.5 studs behind
                            nx = t_pos[0] + (bx * 3.5)
                            ny = t_pos[1]
                            nz = t_pos[2] + (bz * 3.5)
                            
                            pos_data = struct.pack('fff', nx, ny, nz)
                            for _ in range(15):
                                mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00' * 12)
                    else:
                        STAY_BEHIND_TARGET_ADDR = 0

            # 1.4 Bang
            if not active_interaction and BANG_TARGET_ADDR != 0:
                with CACHE_LOCK:
                    target = next((p for p in PLAYER_CACHE if p['ptr'] == BANG_TARGET_ADDR), None)
                    if target and target['hp'] > 0 and target['hrp_prim']:
                        active_interaction = True
                        tp_raw = mem.read_mem(target['hrp_prim'] + O_POSITION, 12)
                        tr_raw = mem.read_mem(target['hrp_prim'] + O_CFRAME, 36) # Corrected to O_CFRAME
                        if tp_raw and len(tr_raw) == 36:
                            t_pos = struct.unpack('fff', tp_raw)
                            tr = struct.unpack('9f', tr_raw)
                            bx, by, bz = tr[2], tr[5], tr[8]
                            
                            # Rapid oscillation along the back vector
                            offset = 1.0 + math.sin(time.time() * 25) * 1.5
                            nx = t_pos[0] + (bx * offset)
                            ny = t_pos[1]
                            nz = t_pos[2] + (bz * offset)
                            
                            pos_data = struct.pack('fff', nx, ny, nz)
                            for _ in range(20):
                                mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00' * 12)
                    else:
                        BANG_TARGET_ADDR = 0

            # 1. Loop-Goto
            if not active_interaction and LOOP_GOTO_TARGET_ADDR != 0:
                with CACHE_LOCK:
                    target = next((p for p in PLAYER_CACHE if p['ptr'] == LOOP_GOTO_TARGET_ADDR), None)
                    if target and target['hp'] > 0 and target['hrp_prim']:
                        active_interaction = True
                        tp_raw = mem.read_mem(target['hrp_prim'] + O_POSITION, 12)
                        if tp_raw:
                            for _ in range(10):
                                mem.write_mem(l_pos_prim + O_POSITION, tp_raw)
                                mem.write_mem(l_pos_prim + O_VELOCITY, b'\x00' * 12)
                    else:
                        LOOP_GOTO_TARGET_ADDR = 0
        
        # Standard Orbit (PLAYERS Tab)
        if not active_interaction and ORBIT_ENABLED and SELECTED_PLAYER_INDEX != -1:
            with CACHE_LOCK:
                if SELECTED_PLAYER_INDEX < len(PLAYER_CACHE):
                    t_data = PLAYER_CACHE[SELECTED_PLAYER_INDEX]
                    tp_raw = mem.read_mem(t_data['hrp_prim'] + O_POSITION, 12)
                    if tp_raw:
                        tpx, tpy, tpz = struct.unpack('fff', tp_raw)
                        ORBIT_ANGLE += ORBIT_SPEED * dt
                        nx = tpx + math.cos(ORBIT_ANGLE) * ORBIT_RADIUS
                        nz = tpz + math.sin(ORBIT_ANGLE) * ORBIT_RADIUS
                        ny = tpy + ORBIT_HEIGHT
                        if l_pos_prim:
                            pos_data = struct.pack('fff', nx, ny, nz)
                            vel_data = struct.pack('fff', 0.0, 0.0, 0.0)
                            for _ in range(10):
                                mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                mem.write_mem(l_pos_prim + O_VELOCITY, vel_data)
        
        # === RAGE MODE (Addict Tab) ===
        # Handle Rage keybind state
        rage_key_down = bool(win32api.GetAsyncKeyState(ADDICT_RAGE_KEY) & 0x8000) if ADDICT_RAGE_KEY != 0 else False
        
        if ADDICT_RAGE_ENABLED:
            if ADDICT_RAGE_MODE == 0:  # Hold mode
                is_raging = rage_key_down
            else:  # Toggle mode
                if rage_key_down and not getattr(main, '_last_rage_key_state', False):
                    ADDICT_RAGE_TOGGLE_STATE = not ADDICT_RAGE_TOGGLE_STATE
                is_raging = ADDICT_RAGE_TOGGLE_STATE
            main._last_rage_key_state = rage_key_down
            
            if is_raging:
                # Find target under cursor
                if ADDICT_RAGE_TARGET_ADDR == 0:
                    # Find player closest to cursor
                    best_dist = 50  # Pixel threshold for cursor detection
                    best_addr = 0
                    with CACHE_LOCK:
                        for p_data in PLAYER_CACHE:
                            if p_data['hp'] <= 0: continue
                            if WHITELIST_OPTS["Rage Orbit"] and p_data['ptr'] in WHITELISTED_PLAYERS: continue
                            hrp_prim = p_data['hrp_prim']
                            if hrp_prim:
                                p_raw = mem.read_mem(hrp_prim + O_POSITION, 12)
                                if p_raw:
                                    px, py, pz = struct.unpack('fff', p_raw)
                                    scr = w2s_scr(vec3(px, py, pz))
                                    if scr.x != -1:
                                        dist = math.sqrt((scr.x - (cur_cli_x + off_x))**2 + (scr.y - (cur_cli_y + off_y))**2)
                                        if dist < best_dist:
                                            best_dist = dist
                                            best_addr = p_data['ptr']
                    if best_addr:
                        ADDICT_RAGE_TARGET_ADDR = best_addr
                        ADDICT_RAGE_ORBIT_ANGLE = 0.0
                
                # Orbit around target
                if not active_interaction and ADDICT_RAGE_TARGET_ADDR and l_pos_prim:
                    with CACHE_LOCK:
                        target_data = None
                        for p_data in PLAYER_CACHE:
                            if p_data['ptr'] == ADDICT_RAGE_TARGET_ADDR:
                                target_data = p_data
                                break
                        
                        if target_data and target_data['hp'] > 0 and target_data['hrp_prim']:
                            tp_raw = mem.read_mem(target_data['hrp_prim'] + O_POSITION, 12)
                            if tp_raw:
                                tpx, tpy, tpz = struct.unpack('fff', tp_raw)
                                ADDICT_RAGE_ORBIT_ANGLE += ADDICT_RAGE_ORBIT_SPEED * dt
                                nx = tpx + math.cos(ADDICT_RAGE_ORBIT_ANGLE) * ADDICT_RAGE_ORBIT_RADIUS
                                nz = tpz + math.sin(ADDICT_RAGE_ORBIT_ANGLE) * ADDICT_RAGE_ORBIT_RADIUS
                                ny = tpy + ADDICT_RAGE_ORBIT_HEIGHT
                                pos_data = struct.pack('fff', nx, ny, nz)
                                vel_data = struct.pack('fff', 0.0, 0.0, 0.0)
                                for _ in range(10):
                                    mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                    mem.write_mem(l_pos_prim + O_VELOCITY, vel_data)
                            
                            # Auto-click if raging (Spam click)
                            ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)  # Mouse down
                            ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)  # Mouse up
                        else:
                            # Target died or invalid, reset
                            ADDICT_RAGE_TARGET_ADDR = 0
            else:
                # Not raging, reset target
                ADDICT_RAGE_TARGET_ADDR = 0
        
        # === KILL ALL SYSTEM ===
        if not active_interaction and KILL_ALL_ENABLED and l_pos_prim:
            # Check if player has a tool equipped
            KILL_ALL_TOOL_EQUIPPED = False
            l_char = LOCAL_PLAYER_INFO["char"]
            if l_char:
                try:
                    # Check for Tool in character (equipped tools are parented to character)
                    for child in mem.get_children(l_char):
                        class_name = mem.get_class_name(child)
                        if "Tool" in class_name:
                            KILL_ALL_TOOL_EQUIPPED = True
                            break
                except:
                    pass
            
            # Find or validate target
            if KILL_ALL_TARGET_ADDR == 0:
                # Find next valid target
                with CACHE_LOCK:
                    for idx, p_data in enumerate(PLAYER_CACHE):
                        if p_data['hp'] <= 0: continue
                        if WHITELIST_OPTS["Kill All"] and p_data['ptr'] in WHITELISTED_PLAYERS: continue
                        if TEAM_CHECK and my_team != 0 and p_data['team'] == my_team: continue
                        # Found a valid target
                        KILL_ALL_TARGET_ADDR = p_data['ptr']
                        KILL_ALL_ORBIT_ANGLE = 0.0
                        # Set spectate to this player
                        SELECTED_PLAYER_INDEX = idx
                        break
            else:
                # Check if current target is still valid
                with CACHE_LOCK:
                    target_data = None
                    target_index = -1
                    for idx, p_data in enumerate(PLAYER_CACHE):
                        if p_data['ptr'] == KILL_ALL_TARGET_ADDR:
                            target_data = p_data
                            target_index = idx
                            break
                    
                    if target_data and target_data['hp'] > 0 and target_data['hrp_prim']:
                        # Calculate health percentage
                        hp_percent = (target_data['hp'] / target_data['m_hp'] * 100) if target_data['m_hp'] > 0 else 0
                        
                        # Update spectate to current target (Camera follow)
                        cam = mem.read_ptr(mem.workspace + O_CAMERA)
                        if cam:
                            target_subj = target_data['hum'] if target_data['hum'] else target_data['char']
                            if target_subj:
                                mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', target_subj))
                        
                        SELECTED_PLAYER_INDEX = target_index
                        
                        # Check if we should switch targets
                        if hp_percent <= KILL_ALL_HEALTH_THRESHOLD:
                            # Target is low enough, switch to next target
                            KILL_ALL_TARGET_ADDR = 0
                            # Reset camera to self
                            if cam:
                                l_hum = LOCAL_PLAYER_INFO.get("hum")
                                if l_hum: mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', l_hum))
                            SELECTED_PLAYER_INDEX = -1
                        else:
                            # Orbit around target with dedicated Kill All settings
                            tp_raw = mem.read_mem(target_data['hrp_prim'] + O_POSITION, 12)
                            if tp_raw:
                                tpx, tpy, tpz = struct.unpack('fff', tp_raw)
                                KILL_ALL_ORBIT_ANGLE += KILL_ALL_ORBIT_SPEED * dt
                                nx = tpx + math.cos(KILL_ALL_ORBIT_ANGLE) * KILL_ALL_ORBIT_RADIUS
                                nz = tpz + math.sin(KILL_ALL_ORBIT_ANGLE) * KILL_ALL_ORBIT_RADIUS
                                ny = tpy + KILL_ALL_ORBIT_HEIGHT
                                pos_data = struct.pack('fff', nx, ny, nz)
                                vel_data = struct.pack('fff', 0.0, 0.0, 0.0)
                                for _ in range(10):
                                    mem.write_mem(l_pos_prim + O_POSITION, pos_data)
                                    mem.write_mem(l_pos_prim + O_VELOCITY, vel_data)
                            
                            # Spam click if tool is equipped (continuous clicking)
                            if KILL_ALL_TOOL_EQUIPPED:
                                # Click and release rapidly
                                ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)  # Mouse down
                                ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)  # Mouse up
                    else:
                        # Target died or invalid, reset and find new target
                        KILL_ALL_TARGET_ADDR = 0
                        # Reset camera focus
                        cam = mem.read_ptr(mem.workspace + O_CAMERA)
                        if cam:
                            l_hum = LOCAL_PLAYER_INFO.get("hum")
                            if l_hum: mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', l_hum))
                        SELECTED_PLAYER_INDEX = -1
        else:
            # Kill All disabled - clean up only if we had an active target
            if KILL_ALL_TARGET_ADDR != 0:
                cam = mem.read_ptr(mem.workspace + O_CAMERA)
                if cam:
                    l_hum = LOCAL_PLAYER_INFO.get("hum")
                    if l_hum: mem.write_mem(cam + O_CAMERA_SUBJECT, struct.pack('Q', l_hum))
                KILL_ALL_TARGET_ADDR = 0
                # Only deselect if selection matches what we were killing
                SELECTED_PLAYER_INDEX = -1
        
        if TRIGGERBOT_ENABLED and not MENU_OPEN and (win32api.GetAsyncKeyState(TRIGGER_KEY) & 0x8000):
            if time.time() - LAST_SHOT_TIME > trigger_delay:
                with CACHE_LOCK:
                    for p_data in PLAYER_CACHE:
                        if p_data['hp'] <= 2: continue
                        if TEAM_CHECK and my_team != 0 and p_data['team'] == my_team: continue
                        h_prim = p_data['part_prims'].get("Head")
                        if h_prim:
                            h_pos_raw = mem.read_mem(h_prim + O_POSITION, 12)
                            if h_pos_raw:
                                h_pos_v = vec3(*struct.unpack('fff', h_pos_raw))
                                h_scr = mem.world_to_screen(h_pos_v, vm, client_w, client_h)
                                if h_scr.x != -1:
                                    if math.sqrt((h_scr.x - cur_cli_x)**2 + (h_scr.y - cur_cli_y)**2) < 18:
                                        ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)
                                        ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)
                                        LAST_SHOT_TIME = time.time(); break
        with CACHE_LOCK:
            render_list = list(PLAYER_CACHE)
            for p_data in render_list:
                p, char = p_data['ptr'], p_data['char']
                if WHITELIST_OPTS["Full ESP"] and p in WHITELISTED_PLAYERS: continue
                hp, m_hp = p_data['hp'], p_data['m_hp']
                if hp <= 0:
                    if p == LOCKED_PLAYER_ADDR: LOCKED_PLAYER_ADDR = 0
                    continue
                p_ptr = p_data['ptr']
                h_prim = p_data['part_prims'].get("Head")
                r_prim = p_data['hrp_prim']
                is_lp = (p_ptr == LOCKED_PLAYER_ADDR)
                is_st = (p_ptr == SILENT_AIM_TARGET_ADDR)
                if p_ptr not in HIT_NOTIF_CACHE:
                    HIT_NOTIF_CACHE[p_ptr] = hp
                else:
                    old_hp = HIT_NOTIF_CACHE[p_ptr]
                    if hp < (old_hp - 0.1): # Added 0.1 threshold to prevent noise from float inaccuracies
                        # Damage detected!
                        should_notif = (is_lp and AIM_HIT_NOTIF) or (is_st and SILENT_AIM_HIT_NOTIF)
                        
                        if should_notif:
                            # Play sound only for our active targets
                            play_hitsound()
                            
                            diff = old_hp - hp
                            ACTIVE_NOTIFICATIONS.append(GlyconNotification(f"Hit {p_data['name']} for {round(diff, 1)}", uid=p_data.get('userId', 0), category="Damage Dealt"))
                    HIT_NOTIF_CACHE[p_ptr] = hp
                p_pos_raw = mem.read_mem(r_prim + O_POSITION, 24)
                if not p_pos_raw or len(p_pos_raw) < 24: continue
                u_pos = struct.unpack('6f', p_pos_raw)
                p_pos = vec3(u_pos[0], u_pos[1], u_pos[2])
                vel = vec3(u_pos[3], u_pos[4], u_pos[5])
                h_pos_fresh = None
                if h_prim:
                    h_raw = mem.read_mem(h_prim + O_POSITION, 12)
                    if h_raw and len(h_raw) == 12: h_pos_fresh = vec3(*struct.unpack('fff', h_raw))
                dist_3d = math.sqrt((p_pos.x-my_pos.x)**2 + (p_pos.y-my_pos.y)**2 + (p_pos.z-my_pos.z)**2)
                h_pos_extrapolated = h_pos_fresh if h_pos_fresh else p_pos
                real_pos = p_pos
                if p in INSTANCE_NODE_CACHE:
                    t_hist = INSTANCE_NODE_CACHE[p]["pos_hist"]
                    if not t_hist or (abs(t_hist[-1].x - real_pos.x) > 0.05 or abs(t_hist[-1].z - real_pos.z) > 0.05):
                        t_hist.append(real_pos)
                        if len(t_hist) > TRAIL_LENGTH: t_hist.pop(0)
                if SHOW_TRAILS and p in INSTANCE_NODE_CACHE:
                    t_hist = INSTANCE_NODE_CACHE[p]["pos_hist"]
                    if len(t_hist) > 1:
                        for i in range(len(t_hist)-1):
                            p1 = w2s_scr(t_hist[i])
                            p2 = w2s_scr(t_hist[i+1])
                            if p1.x != -1 and p2.x != -1:
                                draw_list.add_line(p1.x, p1.y, p2.x, p2.y, imgui.get_color_u32_rgba(*TRAIL_COLOR), 1.0)
                if SHOW_RADAR:
                    rx = (real_pos.x-my_pos.x) * math.cos(cam_angle) + (real_pos.z-my_pos.z) * math.sin(cam_angle)
                    ry = (real_pos.z-my_pos.z) * math.cos(cam_angle) - (real_pos.x-my_pos.x) * math.sin(cam_angle)
                    scale = (RADAR_SIZE / 2) / RADAR_RANGE
                    fx, fy = (off_x + RADAR_X + RADAR_SIZE/2) + (rx*scale), (off_y + RADAR_Y + RADAR_SIZE/2) + (ry*scale)
                    if (off_x + RADAR_X) < fx < (off_x + RADAR_X + RADAR_SIZE) and (off_y + RADAR_Y) < fy < (off_y + RADAR_Y + RADAR_SIZE):
                        if p == LOCKED_PLAYER_ADDR and is_aiming: draw_list.add_circle(fx, fy, 6 + v_pulse*4, imgui.get_color_u32_rgba(1, 0, 0, v_pulse), thickness=2)
                        elif dist_3d < 25: draw_list.add_circle(fx, fy, 6 + v_pulse*3, imgui.get_color_u32_rgba(1, 0.4, 0, v_pulse), thickness=1.5)
                        elif p in MARKED_PLAYERS: draw_list.add_circle(fx, fy, 6 + v_pulse*3, imgui.get_color_u32_rgba(1, 1, 0, v_pulse), thickness=1.5)
                        draw_list.add_circle_filled(fx, fy, 3, 0xFF00FFFF if p in MARKED_PLAYERS else 0xFFE32B8A)
                s_top_pos = vec3(p_pos.x, p_pos.y + 2.5, p_pos.z)
                if h_pos_extrapolated: s_top_pos = vec3(h_pos_extrapolated.x, h_pos_extrapolated.y + 0.8, h_pos_extrapolated.z)
                s_top = w2s_scr(s_top_pos)
                s_bot = w2s_scr(vec3(p_pos.x, p_pos.y - 3.5, p_pos.z))
                if SHOW_OFFSCREEN and s_top.x == -1:
                    vec_to = vec3(p_pos.x - my_pos.x, p_pos.y - my_pos.y, p_pos.z - my_pos.z)
                    ang = math.atan2(vec_to.z, vec_to.x) - cam_angle
                    arrow_rad = 300
                    arrow_size = 12 + (v_pulse * 4)
                    cx, cy = client_w / 2, client_h / 2
                    base_x = cx + math.cos(ang) * arrow_rad
                    base_y = cy + math.sin(ang) * arrow_rad
                    tip_x = base_x + math.cos(ang) * arrow_size
                    tip_y = base_y + math.sin(ang) * arrow_size
                    back_center_x = base_x - math.cos(ang) * (arrow_size * 0.4)
                    back_center_y = base_y - math.sin(ang) * (arrow_size * 0.4)
                    perp_x = -math.sin(ang) * (arrow_size * 0.7)
                    perp_y = math.cos(ang) * (arrow_size * 0.7)
                    p1_x, p1_y = back_center_x + perp_x, back_center_y + perp_y
                    p2_x, p2_y = back_center_x - perp_x, back_center_y - perp_y
                    for i in range(1, 4):
                        g_alpha = 0.3 / i
                        g_scale = i * 3
                        draw_list.add_triangle_filled(
                            tip_x + math.cos(ang) * g_scale, tip_y + math.sin(ang) * g_scale,
                            p1_x - math.cos(ang) * g_scale, p1_y - math.sin(ang) * g_scale,
                            p2_x - math.cos(ang) * g_scale, p2_y - math.sin(ang) * g_scale,
                            imgui.get_color_u32_rgba(0.54, 0.17, 0.89, g_alpha)
                        )
                    draw_list.add_triangle_filled(tip_x, tip_y, p1_x, p1_y, p2_x, p2_y, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 1.0))
                    draw_list.add_triangle(tip_x, tip_y, p1_x, p1_y, p2_x, p2_y, 0xFFFFFFFF, thickness=1.5)
                    info_txt = f"{p_data['name']}\n{int(dist_3d)}m"
                    tw, th = imgui.calc_text_size(info_txt)
                    tx = tip_x + math.cos(ang) * 25 - tw/2
                    ty = tip_y + math.sin(ang) * 25 - th/2
                    draw_list.add_text(tx, ty, 0xFFFFFFFF, info_txt)
                if s_top.x != -1:
                    h_esp = abs(s_bot.y - s_top.y); w_esp = h_esp/3; esp_color = imgui.get_color_u32_rgba(*ESP_COLOR)
                    mid_x = (s_top.x + s_bot.x) / 2
                    if TEAM_CHECK and my_team != 0 and p_data['team'] == my_team: esp_color = 0xFF00FF00
                    elif p in MARKED_PLAYERS: esp_color = 0xFF00FFFF
                    if SHOW_FILLED_BOX:
                        if SHOW_GRADIENT_FILL:
                            top_col = imgui.get_color_u32_rgba(*GRADIENT_FILL_COLOR_TOP)
                            bot_col = imgui.get_color_u32_rgba(*GRADIENT_FILL_COLOR_BOT)
                            if GRADIENT_FILL_DIRECTION == 0: # Vertical
                                draw_list.add_rect_filled_multicolor(mid_x-w_esp, s_top.y, mid_x+w_esp, s_bot.y, top_col, top_col, bot_col, bot_col)
                            else: # Horizontal
                                draw_list.add_rect_filled_multicolor(mid_x-w_esp, s_top.y, mid_x+w_esp, s_bot.y, top_col, bot_col, bot_col, top_col)
                        else:
                            draw_list.add_rect_filled(mid_x-w_esp, s_top.y, mid_x+w_esp, s_bot.y, imgui.get_color_u32_rgba(*FILLED_BOX_COLOR))
                    if SHOW_ESP:
                        draw_list.add_rect(mid_x-w_esp, s_top.y, mid_x+w_esp, s_bot.y, 0xFF000000, thickness=2.5)
                        draw_list.add_rect(mid_x-w_esp, s_top.y, mid_x+w_esp, s_bot.y, esp_color, thickness=1.0)
                    if SHOW_CORNERS:
                        cl = h_esp / 4
                        pad = 4.0
                        lx, rx = mid_x - w_esp - pad, mid_x + w_esp + pad
                        ty, by = s_top.y - pad, s_bot.y + pad
                        def draw_outlined_corner(x, y, dx, dy):
                            draw_list.add_line(x, y, x + dx, y, 0xFF000000, 3.5)
                            draw_list.add_line(x, y, x, y + dy, 0xFF000000, 3.5)
                            draw_list.add_line(x, y, x + dx, y, esp_color, 1.5)
                            draw_list.add_line(x, y, x, y + dy, esp_color, 1.5)
                        draw_outlined_corner(lx, ty, cl, cl)
                        draw_outlined_corner(rx, ty, -cl, cl)
                        draw_outlined_corner(lx, by, cl, -cl)
                        draw_outlined_corner(rx, by, -cl, -cl)
                    if SHOW_SKELETON and dist_3d < 150:
                        joint_setup = [
                            ("Head", "UpperTorso"),
                            ("UpperTorso", "LowerTorso"),
                            ("UpperTorso", "LeftUpperArm"),
                            ("UpperTorso", "RightUpperArm"),
                            ("LowerTorso", "LeftUpperLeg"),
                            ("LowerTorso", "RightUpperLeg")
                        ]
                        if "UpperTorso" not in p_data['part_prims']:
                             joint_setup = [
                                ("Head", "Torso"),
                                ("Torso", "Left Arm"),
                                ("Torso", "Right Arm"),
                                ("Torso", "Left Leg"),
                                ("Torso", "Right Leg")
                            ]
                        needed_parts = set()
                        for j1, j2 in joint_setup:
                            needed_parts.add(j1); needed_parts.add(j2)
                        local_pos_cache = {}
                        for pname in needed_parts:
                            prim = p_data['part_prims'].get(pname)
                            if prim:
                                pos_raw = mem.read_mem(prim + O_POSITION, 12)
                                if pos_raw:
                                    local_pos_cache[pname] = vec3(*struct.unpack('fff', pos_raw))
                        for j1, j2 in joint_setup:
                            if j1 in local_pos_cache and j2 in local_pos_cache:
                                sc1 = w2s_scr(local_pos_cache[j1])
                                sc2 = w2s_scr(local_pos_cache[j2])
                                if sc1.x != -1 and sc2.x != -1:
                                    draw_list.add_line(sc1.x, sc1.y, sc2.x, sc2.y, imgui.get_color_u32_rgba(*SKELETON_COLOR), 1.0)
                    if SHOW_VIEW_LINES and h_pos_extrapolated and dist_3d < 200:
                            h_pos = h_pos_extrapolated
                            cf_rot = struct.unpack('9f', mem.read_mem(p_data['hrp_node'] + O_CFRAME, 36))
                            lv = vec3(-cf_rot[2], -cf_rot[5], -cf_rot[8]); end_v = vec3(h_pos.x + lv.x * 5, h_pos.y + lv.y * 5, h_pos.z + lv.z * 5)
                            s_end = w2s_scr(end_v); s_h = w2s_scr(h_pos)
                            if s_end.x != -1 and s_h.x != -1: draw_list.add_line(s_h.x, s_h.y, s_end.x, s_end.y, imgui.get_color_u32_rgba(*VIEW_LINE_COLOR), 1.5)
                    if SHOW_NAMES:
                        n_txt = p_data['name']
                        p_user_id = p_data.get('userId', 0)
                        nw, nh = imgui.calc_text_size(n_txt)
                        thumb_size = 24
                        thumb_padding = 4
                        has_thumbnail = False
                        if p_user_id and p_user_id > 0:
                            cache_entry = PLAYER_THUMBNAIL_CACHE.get(p_user_id)
                            if not cache_entry:
                                fetch_player_thumbnail(p_user_id)
                                cache_entry = PLAYER_THUMBNAIL_CACHE.get(p_user_id)
                            if cache_entry and cache_entry.get('status') == 'READY':
                                if cache_entry.get('texture') is None:
                                    img = PLAYER_THUMBNAIL_IMAGE_DATA.get(p_user_id)
                                    if img:
                                        img_w, img_h = img.size
                                        img_bytes = img.tobytes()
                                        tex_id = gl.glGenTextures(1)
                                        gl.glBindTexture(gl.GL_TEXTURE_2D, tex_id)
                                        gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
                                        gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
                                        gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, img_w, img_h, 0, gl.GL_RGBA, gl.GL_UNSIGNED_BYTE, img_bytes)
                                        PLAYER_THUMBNAIL_CACHE[p_user_id]['texture'] = tex_id
                                        del PLAYER_THUMBNAIL_IMAGE_DATA[p_user_id]
                                    has_thumbnail = PLAYER_THUMBNAIL_CACHE[p_user_id].get('texture') is not None
                                else:
                                    has_thumbnail = True
                        total_w = nw + 14 + (thumb_size + thumb_padding * 2 if has_thumbnail else 0)
                        bg_h = max(nh + 6, thumb_size + thumb_padding * 2) if has_thumbnail else nh + 6
                        bx = mid_x - total_w/2
                        by = s_top.y - bg_h - 8
                        for i in range(1, 6):
                            glow_alpha = 0.25 / (i * 0.7)
                            draw_list.add_rect(bx-i, by-i, bx+total_w+i, by+bg_h+i, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, glow_alpha), 10.0)
                        draw_list.add_rect_filled(bx, by, bx+total_w, by+bg_h, imgui.get_color_u32_rgba(0.07, 0.06, 0.09, 0.9), 10.0)
                        draw_list.add_rect(bx, by, bx+total_w, by+bg_h, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 1.0), 10.0, thickness=1.5)
                        text_x = bx + 7
                        if has_thumbnail:
                            thumb_x = bx + thumb_padding
                            thumb_y = by + (bg_h - thumb_size) / 2
                            for i in range(1, 4):
                                thumb_glow_alpha = 0.3 / (i * 0.6)
                                draw_list.add_rect(thumb_x-i, thumb_y-i, thumb_x+thumb_size+i, thumb_y+thumb_size+i, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, thumb_glow_alpha), 6.0)
                            draw_list.add_rect_filled(thumb_x, thumb_y, thumb_x+thumb_size, thumb_y+thumb_size, imgui.get_color_u32_rgba(0.12, 0.10, 0.16, 1.0), 6.0)
                            tex_id = PLAYER_THUMBNAIL_CACHE[p_user_id].get('texture')
                            if tex_id:
                                draw_list.add_image(tex_id, (thumb_x, thumb_y), (thumb_x+thumb_size, thumb_y+thumb_size), (0, 0), (1, 1), imgui.get_color_u32_rgba(1, 1, 1, 1))
                            draw_list.add_rect(thumb_x, thumb_y, thumb_x+thumb_size, thumb_y+thumb_size, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.8), 6.0, thickness=1.0)
                            text_x = thumb_x + thumb_size + thumb_padding + 4
                        text_y = by + (bg_h - nh) / 2
                        draw_list.add_text(text_x, text_y, imgui.get_color_u32_rgba(*TEXT_COLOR), n_txt)
                    if SHOW_DISTANCE:
                        dist_str = f"[{int(dist_3d)}m]"
                        dw, dh = imgui.calc_text_size(dist_str)
                        draw_list.add_text(mid_x - dw/2, s_bot.y + 5, imgui.get_color_u32_rgba(*DISTANCE_COLOR), dist_str)
                    if SHOW_TRACERS: draw_list.add_line(off_x + client_w/2, off_y + client_h, s_bot.x, s_bot.y, imgui.get_color_u32_rgba(*SNAPLINE_COLOR), TRACER_THICKNESS)
                    if SHOW_THREAD_TRACER:
                        last_tx, last_ty = cur_cli_x + off_x, cur_cli_y + off_y
                        steps = 10
                        for step in range(1, steps + 1):
                            t = step / steps
                            tx, ty = (cur_cli_x + off_x) + (s_bot.x - (cur_cli_x + off_x)) * t, (cur_cli_y + off_y) + (s_bot.y - (cur_cli_y + off_y)) * t
                            sway = math.sin(time.time() * 4.0 + t * 5.0) * (10.0 * (1.0 - t))
                            draw_list.add_line(last_tx, last_ty, tx + sway, ty + sway, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.4), THREAD_TRACER_THICKNESS)
                            last_tx, last_ty = tx + sway, ty + sway
                    if SHOW_HEAD_DOT and h_pos_extrapolated:
                            h_scr = w2s_scr(h_pos_extrapolated)
                            if h_scr.x != -1: draw_list.add_circle(h_scr.x, h_scr.y, h_esp/14, imgui.get_color_u32_rgba(*HEAD_DOT_COLOR), thickness=1.2)
                    if SHOW_SCANNER_ESP and dist_3d < 100:
                        sh_off = math.sin(time.time() * 3.0) * 3.0
                        rb_h = (time.time() * 0.5) % 1.0
                        rb_r, rb_g, rb_b = imgui.color_convert_hsv_to_rgb(rb_h, 1.0, 1.0)
                        scan_color = imgui.get_color_u32_rgba(rb_r, rb_g, rb_b, 1.0)
                        points = []
                        for i in range(13):
                            ang = (i * (360/12)) * (math.pi/180)
                            wp = vec3(real_pos.x + math.cos(ang)*2.5, real_pos.y + sh_off, real_pos.z + math.sin(ang)*2.5)
                            sp = w2s_scr(wp)
                            if sp.x != -1: points.append(sp)
                        for i in range(len(points)-1): draw_list.add_line(points[i].x, points[i].y, points[i+1].x, points[i+1].y, scan_color, 4.5)
                    if SHOW_GROUND_SHAPE and dist_3d < 300:
                        g_y = real_pos.y - 3.0
                        g_rad = 2.0
                        g_pts = []
                        for i in range(13):
                            ang_rad = (i * (360/12)) * (math.pi/180)
                            gp = vec3(real_pos.x + math.cos(ang_rad)*g_rad, g_y, real_pos.z + math.sin(ang_rad)*g_rad)
                            gp_s = w2s_scr(gp)
                            if gp_s.x != -1: g_pts.append(gp_s)
                        if len(g_pts) > 1:
                            for i in range(len(g_pts)-1):
                                draw_list.add_line(g_pts[i].x, g_pts[i].y, g_pts[i+1].x, g_pts[i+1].y, 0xFFFFFFFF, 2.0)
                    if HITBOX_EXPANDER_ENABLED and HITBOX_VISUALIZER_ENABLED:
                        s = HITBOX_SIZE_VAL / 2.0
                        corners = [
                            vec3(real_pos.x - s, real_pos.y - s, real_pos.z - s), vec3(real_pos.x + s, real_pos.y - s, real_pos.z - s),
                            vec3(real_pos.x + s, real_pos.y + s, real_pos.z - s), vec3(real_pos.x - s, real_pos.y + s, real_pos.z - s),
                            vec3(real_pos.x - s, real_pos.y - s, real_pos.z + s), vec3(real_pos.x + s, real_pos.y - s, real_pos.z + s),
                            vec3(real_pos.x + s, real_pos.y + s, real_pos.z + s), vec3(real_pos.x - s, real_pos.y + s, real_pos.z + s)
                        ]
                        scr_pts = [w2s_scr(p) for p in corners]
                        if any(p.x != -1 for p in scr_pts):
                            hb_col = imgui.get_color_u32_rgba(*HITBOX_VISUALIZER_COLOR)
                            for i in range(4):
                                p1, p2 = scr_pts[i], scr_pts[(i+1)%4]
                                if p1.x != -1 and p2.x != -1: draw_list.add_line(p1.x, p1.y, p2.x, p2.y, hb_col, 1.2)
                                p1, p2 = scr_pts[4+i], scr_pts[4+((i+1)%4)]
                                if p1.x != -1 and p2.x != -1: draw_list.add_line(p1.x, p1.y, p2.x, p2.y, hb_col, 1.2)
                                p1, p2 = scr_pts[i], scr_pts[i+4]
                                if p1.x != -1 and p2.x != -1: draw_list.add_line(p1.x, p1.y, p2.x, p2.y, hb_col, 1.2)
                    if SHOW_HEALTH:
                        hp_perc = max(0.0, min(1.0, hp / m_hp))
                        h_off = 10 if SHOW_CORNERS else 6
                        # Background/Border
                        draw_list.add_rect(mid_x - w_esp - h_off, s_top.y, mid_x - w_esp - h_off + 4, s_bot.y, 0xFF000000, thickness=2.5) 
                        draw_list.add_rect(mid_x - w_esp - h_off, s_top.y, mid_x - w_esp - h_off + 4, s_bot.y, 0xFFFFFFFF, thickness=1.0) 
                        
                        bx1, by1 = mid_x - w_esp - h_off + 1, s_bot.y - (h_esp * hp_perc)
                        bx2, by2 = mid_x - w_esp - h_off + 3, s_bot.y
                        
                        if HEALTH_GRADIENT_ENABLED:
                            c1 = imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR)
                            c2 = imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR_BOT)
                            draw_list.add_rect_filled_multicolor(bx1, by1, bx2, by2, c1, c1, c2, c2)
                        else:
                            draw_list.add_rect_filled(bx1, by1, bx2, by2, imgui.get_color_u32_rgba(*HEALTH_BAR_COLOR))
                        if SHOW_HEALTH_TEXT:
                            hp_text = str(int(hp))
                            htw, hth = imgui.calc_text_size(hp_text)
                            draw_list.add_text(mid_x - w_esp - h_off - htw - 4, s_bot.y - (h_esp * hp_perc) - hth/2, imgui.get_color_u32_rgba(*TEXT_COLOR), hp_text)
                    if AIMBOT_ENABLED and is_aiming and p != LOCAL_PLAYER_INFO['ptr']:
                        # Whitelist checks for MouseLock/CamLock
                        if AIM_TYPE_INDEX == 0 and WHITELIST_OPTS["MouseLock"] and p in WHITELISTED_PLAYERS: continue
                        if AIM_TYPE_INDEX == 1 and WHITELIST_OPTS["CamLock"] and p in WHITELISTED_PLAYERS: continue
                        
                        if STICKY_AIM and LOCKED_PLAYER_ADDR != 0 and p != LOCKED_PLAYER_ADDR: continue
                        if TEAM_CHECK and my_team != 0 and p_data['team'] == my_team: continue
                        is_bot = "[BOT]" in p_data.get('name', '')
                        if not is_bot and AIM_KNOCK_CHECK and hp <= 2: continue
                        t_prim = p_data['part_prims'].get(BODY_PARTS[TARGET_PART_INDEX])
                        if t_prim:
                            tp_vec = vec3(*struct.unpack('fff', mem.read_mem(t_prim + O_POSITION, 12)))
                            if PREDICTION_ENABLED:
                                pred_scale = min(dist_3d / 10, 15.0)
                                ping_comp = (RESOLVER_PING / 1000.0) if RESOLVER_ENABLED else 0.0
                                tp_vec = vec3(tp_vec.x + (vel.x * (PREDICTION_AMOUNT + ping_comp) * pred_scale * PRED_X_MULT) + AIM_OFFSET_X, tp_vec.y + (vel.y * (PREDICTION_AMOUNT + ping_comp) * pred_scale * PRED_Y_MULT) + AIM_OFFSET_Y, tp_vec.z + (vel.z * (PREDICTION_AMOUNT + ping_comp) * pred_scale * PRED_Z_MULT) + AIM_OFFSET_Z)
                            else: tp_vec.x += AIM_OFFSET_X; tp_vec.y += AIM_OFFSET_Y; tp_vec.z += AIM_OFFSET_Z
                            if JITTER_ENABLED:
                                tp_vec.x += random.uniform(-JITTER_AMOUNT, JITTER_AMOUNT) / 10.0; tp_vec.y += random.uniform(-JITTER_AMOUNT, JITTER_AMOUNT) / 10.0; tp_vec.z += random.uniform(-JITTER_AMOUNT, JITTER_AMOUNT) / 10.0
                            tp = mem.world_to_screen(tp_vec, vm, client_w, client_h)
                            if tp.x == -1: continue
                            dist_scr = math.sqrt((tp.x - cur_cli_x)**2 + (tp.y - cur_cli_y)**2); is_already_locked = (STICKY_AIM and LOCKED_PLAYER_ADDR == p)
                            if (is_already_locked or dist_scr < AIM_FOV) and dist_3d < min_dist_3d:
                                if not AIM_DISTANCE_CHECK or dist_3d <= AIM_MAX_DISTANCE:
                                    min_dist_3d, best_target, best_target_3d, cur_lock_id = dist_3d, tp, tp_vec, p
                if SILENT_AIM_ENABLED and SHOW_SILENT_TRACER and SILENT_AIM_PART_POS.x != -1:
                    draw_list.add_line(cur_cli_x + off_x, cur_cli_y + off_y, SILENT_AIM_PART_POS.x + off_x, SILENT_AIM_PART_POS.y + off_y, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 0.8), 1.5)
                    draw_list.add_circle_filled(SILENT_AIM_PART_POS.x + off_x, SILENT_AIM_PART_POS.y + off_y, 2.5, imgui.get_color_u32_rgba(0.54, 0.17, 0.89, 1.0))
        if is_aiming and AIMBOT_ENABLED and best_target:
            LOCKED_PLAYER_ADDR = cur_lock_id
            if AIM_TYPE_INDEX == 0:
                diff_x, diff_y = best_target.x - cur_cli_x, best_target.y - cur_cli_y
                if abs(diff_x) > 0.1 or abs(diff_y) > 0.1:
                    dist_to_target = math.sqrt(diff_x**2 + diff_y**2)
                    # If smoothness is low, we want an instant, stationary lock
                    if SMOOTHNESS <= 1.1:
                        move_x, move_y = int(diff_x), int(diff_y)
                        if move_x != 0 or move_y != 0:
                            ctypes.windll.user32.mouse_event(0x0001, move_x, move_y, 0, 0)
                            MOUSE_ACCUM_X = diff_x - move_x
                            MOUSE_ACCUM_Y = diff_y - move_y
                    else:
                        # Dynamic smoothing that slows down as we approach the target for stability
                        # but remains predictive enough to feel stationary
                        dynamic_smooth = SMOOTHNESS
                        if dist_to_target < 10.0: dynamic_smooth = max(1.0, SMOOTHNESS / 3.0)
                        
                        step_x = (diff_x / dynamic_smooth) * AIM_SENS_X
                        step_y = (diff_y / dynamic_smooth) * AIM_SENS_Y
                        
                        MOUSE_ACCUM_X += step_x
                        MOUSE_ACCUM_Y += step_y
                        
                        move_x, move_y = int(MOUSE_ACCUM_X), int(MOUSE_ACCUM_Y)
                        if move_x != 0 or move_y != 0:
                            ctypes.windll.user32.mouse_event(0x0001, move_x, move_y, 0, 0)
                            MOUSE_ACCUM_X -= move_x
                            MOUSE_ACCUM_Y -= move_y
            else:
                if CURRENT_PLACE_ID == 17625359962:
                    global RIVALS_LAST_LBUTTON_STATE, RIVALS_ORIGINAL_ROT
                    l_model = mem.read_ptr(mem.local_player + O_MODEL_INSTANCE)
                    if l_model:
                        l_head = mem.find_child_name(l_model, "Head")
                        if l_head:
                            l_head_prim = mem.read_ptr(l_head + O_PRIMITIVE)
                            if l_head_prim:
                                mem.write_mem(l_head_prim + O_TRANSPARENCY, struct.pack('f', 1.0))
                    is_current_down = bool(win32api.GetAsyncKeyState(0x01) & 0x8000)
                    cam = mem.read_ptr(mem.workspace + O_CAMERA)
                    if cam:
                        if not is_current_down and RIVALS_LAST_LBUTTON_STATE:
                            if RIVALS_ORIGINAL_ROT:
                                mem.write_mem(cam + O_CAMERA_ROT, RIVALS_ORIGINAL_ROT)
                        if is_current_down and not RIVALS_LAST_LBUTTON_STATE:
                            RIVALS_ORIGINAL_ROT = mem.read_mem(cam + O_CAMERA_ROT, 36)
                            cp_raw = mem.read_mem(cam + O_CAMERA_POS, 12)
                            if cp_raw:
                                c_pos = vec3(*struct.unpack('fff', cp_raw))
                                target_back = vec3(c_pos.x - best_target_3d.x, c_pos.y - best_target_3d.y, c_pos.z - best_target_3d.z)
                                mag = math.sqrt(target_back.x**2 + target_back.y**2 + target_back.z**2)
                                if mag > 0.1:
                                    target_back.x /= mag; target_back.y /= mag; target_back.z /= mag
                                    up_global = vec3(0, 1, 0)
                                    if abs(target_back.y) > 0.99: up_global = vec3(0, 0, -1)
                                    r = vec3(up_global.y*target_back.z - up_global.z*target_back.y,
                                             up_global.z*target_back.x - up_global.x*target_back.z,
                                             up_global.x*target_back.y - up_global.y*target_back.x)
                                    mr = math.sqrt(r.x**2 + r.y**2 + r.z**2)
                                    if mr > 0.001: r.x /= mr; r.y /= mr; r.z /= mr
                                    else: r = vec3(1, 0, 0)
                                    u = vec3(target_back.y*r.z - target_back.z*r.y,
                                             target_back.z*r.x - find_back_x*r.z if 'find_back_x' in locals() else target_back.x*r.z,
                                             target_back.x*r.y - target_back.y*r.x)
                                    u = vec3(target_back.y*r.z - target_back.z*r.y,
                                             target_back.z*r.x - target_back.x*r.z,
                                             target_back.x*r.y - target_back.y*r.x)
                                    new_cr = struct.pack('9f', r.x, u.x, target_back.x, r.y, u.y, target_back.y, r.z, u.z, target_back.z)
                                    mem.write_mem(cam + O_CAMERA_ROT, new_cr)
                    RIVALS_LAST_LBUTTON_STATE = is_current_down
                else:
                    cam = mem.read_ptr(mem.workspace + O_CAMERA)
                    if cam:
                        cp_raw = mem.read_mem(cam + O_CAMERA_POS, 12); cr_raw = mem.read_mem(cam + O_CAMERA_ROT, 36)
                        if cp_raw and cr_raw:
                            c_pos = vec3(*struct.unpack('fff', cp_raw))
                            target_back = vec3(c_pos.x - best_target_3d.x, c_pos.y - best_target_3d.y, c_pos.z - best_target_3d.z)
                            mag = math.sqrt(target_back.x**2 + target_back.y**2 + target_back.z**2)
                            if mag > 0.1:
                                target_back.x /= mag; target_back.y /= mag; target_back.z /= mag
                                if SMOOTHNESS <= 1.1:
                                    new_back = target_back
                                else:
                                    curr_r = struct.unpack('9f', cr_raw)
                                    current_back = vec3(curr_r[2], curr_r[5], curr_r[8])
                                    v = 1.0 / max(1.0, SMOOTHNESS)
                                    new_back = vec3(
                                        current_back.x + (target_back.x - current_back.x) * v,
                                        current_back.y + (target_back.y - current_back.y) * v,
                                        current_back.z + (target_back.z - current_back.z) * v
                                    )
                                    mb = math.sqrt(new_back.x**2 + new_back.y**2 + new_back.z**2)
                                    if mb > 0.0001:
                                        new_back.x /= mb; new_back.y /= mb; new_back.z /= mb
                                    else: new_back = vec3(0, 0, 1)
                                
                                up_global = vec3(0, 1, 0)
                                if abs(new_back.y) > 0.99: up_global = vec3(0, 0, -1)
                                r = vec3(up_global.y*new_back.z - up_global.z*new_back.y,
                                         up_global.z*new_back.x - up_global.x*new_back.z,
                                         up_global.x*new_back.y - up_global.y*new_back.x)
                                mr = math.sqrt(r.x**2 + r.y**2 + r.z**2)
                                if mr > 0.001: r.x /= mr; r.y /= mr; r.z /= mr
                                else: r = vec3(1, 0, 0)
                                u = vec3(new_back.y*r.z - new_back.z*r.y,
                                         new_back.z*r.x - new_back.x*r.z,
                                         new_back.x*r.y - new_back.y*r.x)
                                new_cr = struct.pack('9f', r.x, u.x, new_back.x, r.y, u.y, new_back.y, r.z, u.z, new_back.z)
                                mem.write_mem(cam + O_CAMERA_ROT, new_cr)
        if SILENT_AIM_ENABLED:
            s_best_target, s_best_target_3d, s_min_dist = None, None, float('inf')
            silent_target_found = False
            try:
                with CACHE_LOCK:
                    for p_data in PLAYER_CACHE:
                        if p_data['hp'] <= 0: continue
                        if WHITELIST_OPTS["Silent Aim"] and p_data['ptr'] in WHITELISTED_PLAYERS: continue
                        is_bot = "[BOT]" in p_data.get('name', '')
                        if not is_bot and SILENT_AIM_KNOCK_CHECK and p_data['hp'] <= 2: continue
                        if SILENT_AIM_TEAM_CHECK and my_team != 0 and p_data['team'] == my_team: continue
                        if p_data['ptr'] == LOCAL_PLAYER_INFO['ptr']: continue
                        if SILENT_AIM_STICKY and SILENT_AIM_TARGET_ADDR != 0 and p_data['ptr'] != SILENT_AIM_TARGET_ADDR:
                            continue
                        t_pos_raw = mem.read_mem(p_data['hrp_prim'] + O_POSITION, 12)
                        if not t_pos_raw: continue
                        t_pos = vec3(*struct.unpack('fff', t_pos_raw))
                        t_vel_raw = mem.read_mem(p_data['hrp_prim'] + O_VELOCITY, 12)
                        t_vel = vec3(*struct.unpack('fff', t_vel_raw)) if t_vel_raw else vec3(0,0,0)
                        target_part_pos = None
                        if SILENT_AIM_PART_MODE == 0:
                            p_prim = p_data['part_prims'].get(BODY_PARTS[SILENT_AIM_PART_INDEX])
                            if p_prim:
                                pp_raw = mem.read_mem(p_prim + O_POSITION, 12)
                                if pp_raw: target_part_pos = vec3(*struct.unpack('fff', pp_raw))
                        elif SILENT_AIM_PART_MODE == 1:
                            best_p_dist = float('inf')
                            for pname, p_prim in p_data['part_prims'].items():
                                pp_raw = mem.read_mem(p_prim + O_POSITION, 12)
                                if not pp_raw: continue
                                pp_v = vec3(*struct.unpack('fff', pp_raw))
                                pp_c = mem.world_to_screen(pp_v, vm, client_w, client_h)
                                if pp_c.x == -1: continue
                                d_scr = math.sqrt((pp_c.x - cur_cli_x)**2 + (pp_c.y - cur_cli_y)**2)
                                if d_scr < best_p_dist:
                                    best_p_dist = d_scr
                                    target_part_pos = pp_v
                        elif SILENT_AIM_PART_MODE == 2:
                            pp_s = w2s_scr(t_pos)
                            if pp_s.x != -1:
                                target_part_pos = t_pos
                        if not target_part_pos: continue
                        if SILENT_AIM_PREDICTION:
                            pred_scale = min(math.sqrt((target_part_pos.x-my_pos.x)**2 + (target_part_pos.y-my_pos.y)**2 + (target_part_pos.z-my_pos.z)**2) / 10, 15.0)
                            target_part_pos = vec3(target_part_pos.x + (t_vel.x * SILENT_AIM_PRED_X * pred_scale * 0.165), target_part_pos.y + (t_vel.y * SILENT_AIM_PRED_Y * pred_scale * 0.165), target_part_pos.z + (t_vel.z * SILENT_AIM_PRED_X * pred_scale * 0.165))
                        tp = mem.world_to_screen(target_part_pos, vm, client_w, client_h)
                        if tp.x == -1: continue
                        dist_val = 0
                        if SILENT_AIM_METHOD == 0:
                            dist_val = math.sqrt((tp.x - cur_cli_x)**2 + (tp.y - cur_cli_y)**2)
                        else:
                            dist_val = math.sqrt((target_part_pos.x-my_pos.x)**2 + (target_part_pos.y-my_pos.y)**2 + (target_part_pos.z-my_pos.z)**2)
                        if dist_val < s_min_dist:
                            if SILENT_AIM_DISTANCE_CHECK and dist_val > SILENT_AIM_MAX_DISTANCE: continue
                            if SILENT_AIM_METHOD == 1 or dist_val < SILENT_AIM_FOV:
                                s_min_dist = dist_val
                                s_best_target = tp
                                SILENT_AIM_TARGET_ADDR = p_data['ptr']
                                silent_target_found = True
                if silent_target_found:
                    if SILENT_AIM_SMOOTHNESS <= 1.0 or SILENT_AIM_PART_POS.x == -1:
                        SILENT_AIM_PART_POS = s_best_target
                    else:
                        v_lerp = 1.0 / SILENT_AIM_SMOOTHNESS
                        SILENT_AIM_PART_POS.x += (s_best_target.x - SILENT_AIM_PART_POS.x) * v_lerp
                        SILENT_AIM_PART_POS.y += (s_best_target.y - SILENT_AIM_PART_POS.y) * v_lerp
                else:
                    SILENT_AIM_TARGET_ADDR = 0
                    SILENT_AIM_PART_POS = vec2(-1, -1)
            except:
                SILENT_AIM_TARGET_ADDR = 0
                SILENT_AIM_PART_POS = vec2(-1, -1)
        else:
            SILENT_AIM_TARGET_ADDR = 0
            SILENT_AIM_PART_POS = vec2(-1, -1)
        
        # Viewport Silent Aim - Separate targeting with part modes
        if VIEWPORT_SILENT_AIM_ENABLED:
            vp_best_target = None
            vp_min_dist = float('inf')
            vp_found = False
            try:
                with CACHE_LOCK:
                    for p_data in PLAYER_CACHE:
                        if p_data['hp'] <= 0: continue
                        if WHITELIST_OPTS["Rivals Silent Aim"] and p_data['ptr'] in WHITELISTED_PLAYERS: continue
                        is_bot = "[BOT]" in p_data.get('name', '')
                        if not is_bot and p_data['hp'] <= 2: continue  # Knock check always on for players
                        if p_data['ptr'] == LOCAL_PLAYER_INFO['ptr']: continue
                        
                        target_part_pos = None
                        
                        if VIEWPORT_SILENT_PART_MODE == 0:  # Selected Part
                            p_prim = p_data['part_prims'].get(BODY_PARTS[VIEWPORT_SILENT_PART_INDEX])
                            if p_prim:
                                pp_raw = mem.read_mem(p_prim + O_POSITION, 12)
                                if pp_raw: target_part_pos = vec3(*struct.unpack('fff', pp_raw))
                        
                        elif VIEWPORT_SILENT_PART_MODE == 1:  # Closest Part
                            best_p_dist = float('inf')
                            for pname, p_prim in p_data['part_prims'].items():
                                pp_raw = mem.read_mem(p_prim + O_POSITION, 12)
                                if not pp_raw: continue
                                pp_v = vec3(*struct.unpack('fff', pp_raw))
                                pp_c = mem.world_to_screen(pp_v, vm, client_w, client_h)
                                if pp_c.x == -1: continue
                                d_scr = math.sqrt((pp_c.x - cur_cli_x)**2 + (pp_c.y - cur_cli_y)**2)
                                if d_scr < best_p_dist:
                                    best_p_dist = d_scr
                                    target_part_pos = pp_v
                        
                        elif VIEWPORT_SILENT_PART_MODE == 2:  # Closest Point (HRP)
                            hrp_prim = p_data['hrp_prim']
                            if hrp_prim:
                                hrp_raw = mem.read_mem(hrp_prim + O_POSITION, 12)
                                if hrp_raw: target_part_pos = vec3(*struct.unpack('fff', hrp_raw))
                        
                        if not target_part_pos: continue
                        tp = mem.world_to_screen(target_part_pos, vm, client_w, client_h)
                        if tp.x == -1: continue
                        
                        # Distance to cursor
                        dist_scr = math.sqrt((tp.x - cur_cli_x)**2 + (tp.y - cur_cli_y)**2)
                        if dist_scr < vp_min_dist and dist_scr < VIEWPORT_SILENT_FOV:
                            vp_min_dist = dist_scr
                            vp_best_target = tp
                            VIEWPORT_SILENT_TARGET_ADDR = p_data['ptr']
                            vp_found = True
                if vp_found:
                    VIEWPORT_SILENT_TARGET_POS = vp_best_target
                else:
                    VIEWPORT_SILENT_TARGET_ADDR = 0
                    VIEWPORT_SILENT_TARGET_POS = vec2(-1, -1)
            except:
                VIEWPORT_SILENT_TARGET_ADDR = 0
                VIEWPORT_SILENT_TARGET_POS = vec2(-1, -1)
        else:
            VIEWPORT_SILENT_TARGET_ADDR = 0
            VIEWPORT_SILENT_TARGET_POS = vec2(-1, -1)
        imgui.render()
        impl.render(imgui.get_draw_data())
        glfw.swap_buffers(window)
        pass
    time.sleep(0.005)
    try: win32gui.Shell_NotifyIcon(win32gui.NIM_DELETE, (hwnd, 0, 0, 0, 0, ""))
    except: pass
    glfw.terminate()
    os._exit(0)
if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        with open("crash_log.txt", "w") as f:
            f.write(traceback.format_exc())
        os._exit(1)
