' =============================================================
'  NoSleep.vbs  --  Single-file system tray sleep blocker
'  Double-click to run. No console. No extra files needed.
'  Left-click icon: toggle sleep block
'  Right-click icon: menu (auto-start, exit)
' =============================================================
Option Explicit

Dim oShell, oFso, sTmp, sPs1, sVbs, oFile, sCmd, Q
Q = Chr(34)

Set oShell = CreateObject("WScript.Shell")
Set oFso   = CreateObject("Scripting.FileSystemObject")

sTmp = oShell.ExpandEnvironmentStrings("%TEMP%")
sPs1 = sTmp & "\NoSleep_runner.ps1"
sVbs = WScript.ScriptFullName

' Write embedded PowerShell runner to %TEMP%
Set oFile = oFso.CreateTextFile(sPs1, True, False)
oFile.Write BuildScript()
oFile.Close
Set oFile = Nothing

' Launch PowerShell hidden, pass this VBS path so auto-start registers correctly
sCmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive" _
     & " -File " & Q & sPs1 & Q & " " & Q & sVbs & Q
oShell.Run sCmd, 0, False

Set oFso   = Nothing
Set oShell = Nothing

' ---------------------------------------------------------------
'  Embedded PowerShell script  (written to %TEMP% at runtime)
' ---------------------------------------------------------------
Function BuildScript()
    Dim s, Q2, nl
    Q2 = Chr(34)
    nl = vbCrLf

    ' ---- param + imports ----
    s = "param([string]$SelfVbs)" & nl
    s = s & "Add-Type -AssemblyName System.Windows.Forms" & nl
    s = s & "Add-Type -AssemblyName System.Drawing" & nl
    s = s & nl
    ' ---- Win32 API ----
    s = s & "if (-not ([System.Management.Automation.PSTypeName]'NoSleep.PowerUtil').Type) {" & nl
    s = s & "    Add-Type -Namespace NoSleep -Name PowerUtil -MemberDefinition @'" & nl
    s = s & "        [System.Runtime.InteropServices.DllImport(" & Q2 & "kernel32.dll" & Q2 & ")]" & nl
    s = s & "        public static extern uint SetThreadExecutionState(uint esFlags);" & nl
    s = s & "'@" & nl
    s = s & "}" & nl
    s = s & nl
    ' ---- Constants & state ----
    s = s & "$script:FLAGS_AWAKE   = [uint32]0x80000003" & nl
    s = s & "$script:FLAGS_RELEASE = [uint32]0x80000000" & nl
    s = s & "$script:VbsPath  = $SelfVbs" & nl
    s = s & "$script:RegPath  = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'" & nl
    s = s & "$script:RegName  = 'NoSleep_App'" & nl
    s = s & "$script:IsActive = $false" & nl
    s = s & "$script:JiggleEnabled = $true" & nl
    s = s & nl
    ' ---- LED icon painter ----
    s = s & "function New-LedIcon {" & nl
    s = s & "    param([System.Drawing.Color]$Color)" & nl
    s = s & "    $bmp = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)" & nl
    s = s & "    $g   = [System.Drawing.Graphics]::FromImage($bmp)" & nl
    s = s & "    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias" & nl
    s = s & "    $g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50,0,0,0))), 5,7,54,54)" & nl
    s = s & "    $g.FillEllipse((New-Object System.Drawing.SolidBrush($Color)), 2,2,58,58)" & nl
    s = s & "    $g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90,255,255,255))), 14,8,32,18)" & nl
    s = s & "    $g.Dispose()" & nl
    s = s & "    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())" & nl
    s = s & "    $bmp.Dispose()" & nl
    s = s & "    return $icon" & nl
    s = s & "}" & nl
    s = s & nl
    s = s & "$iconGreen = New-LedIcon ([System.Drawing.Color]::FromArgb(255, 34,197,94))" & nl
    s = s & "$iconGray  = New-LedIcon ([System.Drawing.Color]::FromArgb(255,107,114,128))" & nl
    s = s & nl
    ' ---- System tray icon ----
    s = s & "$tray         = New-Object System.Windows.Forms.NotifyIcon" & nl
    s = s & "$tray.Icon    = $iconGray" & nl
    s = s & "$tray.Text    = 'NoSleep - Inactive'" & nl
    s = s & "$tray.Visible = $true" & nl
    s = s & nl
    ' ---- Context menu ----
    s = s & "$menu        = New-Object System.Windows.Forms.ContextMenuStrip" & nl
    s = s & "$miStatus    = New-Object System.Windows.Forms.ToolStripMenuItem 'o  Status: Inactive'" & nl
    s = s & "$miStatus.Enabled = $false" & nl
    s = s & "$miToggle    = New-Object System.Windows.Forms.ToolStripMenuItem '>>  Enable'" & nl
    s = s & "$miAutoStart = New-Object System.Windows.Forms.ToolStripMenuItem" & nl
    s = s & "$miSep       = New-Object System.Windows.Forms.ToolStripSeparator" & nl
    s = s & "$miExit      = New-Object System.Windows.Forms.ToolStripMenuItem 'x  Exit'" & nl
    s = s & "[void]$menu.Items.Add($miStatus)" & nl
    s = s & "[void]$menu.Items.Add($miToggle)" & nl
    s = s & "[void]$menu.Items.Add($miAutoStart)" & nl
    s = s & "[void]$menu.Items.Add($miSep)" & nl
    s = s & "[void]$menu.Items.Add($miExit)" & nl
    s = s & "$tray.ContextMenuStrip = $menu" & nl
    s = s & nl
    ' ---- Mouse jiggle fallback ----
    s = s & "function Invoke-MouseJiggle {" & nl
    s = s & "    if (-not $script:JiggleEnabled) { return }" & nl
    s = s & "    try {" & nl
    s = s & "        $p = [System.Windows.Forms.Cursor]::Position" & nl
    s = s & "        $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds" & nl
    s = s & "        $newX = if ($p.X -lt ($b.Right - 2)) { $p.X + 1 } else { $p.X - 1 }" & nl
    s = s & "        $newPoint = New-Object System.Drawing.Point($newX, $p.Y)" & nl
    s = s & "        [System.Windows.Forms.Cursor]::Position = $newPoint" & nl
    s = s & "        [System.Windows.Forms.Cursor]::Position = $p" & nl
    s = s & "    } catch { }" & nl
    s = s & "}" & nl
    s = s & nl
    ' ---- Timer (refresh sleep block + jiggle every 30 s) ----
    s = s & "$timer          = New-Object System.Windows.Forms.Timer" & nl
    s = s & "$timer.Interval = 30000" & nl
    s = s & "$timer.Add_Tick({" & nl
    s = s & "    [void][NoSleep.PowerUtil]::SetThreadExecutionState($script:FLAGS_AWAKE)" & nl
    s = s & "    Invoke-MouseJiggle" & nl
    s = s & "})" & nl
    s = s & nl
    ' ---- Helper: update auto-start menu text ----
    s = s & "function Update-AutoStartMenu {" & nl
    s = s & "    $exists = [bool](Get-ItemProperty -Path $script:RegPath -Name $script:RegName -ErrorAction SilentlyContinue)" & nl
    s = s & "    $miAutoStart.Text = if ($exists) { '[x]  Remove Auto-Start' } else { '[ ]  Enable Auto-Start' }" & nl
    s = s & "}" & nl
    s = s & "Update-AutoStartMenu" & nl
    s = s & nl
    ' ---- Toggle function ----
    s = s & "function Invoke-Toggle {" & nl
    s = s & "    $script:IsActive = -not $script:IsActive" & nl
    s = s & "    if ($script:IsActive) {" & nl
    s = s & "        [void][NoSleep.PowerUtil]::SetThreadExecutionState($script:FLAGS_AWAKE)" & nl
    s = s & "        Invoke-MouseJiggle" & nl
    s = s & "        $timer.Start()" & nl
    s = s & "        $tray.Icon     = $iconGreen" & nl
    s = s & "        $tray.Text     = 'NoSleep - Active'" & nl
    s = s & "        $miStatus.Text = '*  Status: Active'" & nl
    s = s & "        $miToggle.Text = '||  Disable'" & nl
    s = s & "        $tray.BalloonTipIcon  = [System.Windows.Forms.ToolTipIcon]::None" & nl
    s = s & "        $tray.BalloonTipTitle = 'NoSleep Active'" & nl
    s = s & "        $tray.BalloonTipText  = 'Activated'" & nl
    s = s & "        $tray.ShowBalloonTip(2500)" & nl
    s = s & "    } else {" & nl
    s = s & "        $timer.Stop()" & nl
    s = s & "        [void][NoSleep.PowerUtil]::SetThreadExecutionState($script:FLAGS_RELEASE)" & nl
    s = s & "        $tray.Icon     = $iconGray" & nl
    s = s & "        $tray.Text     = 'NoSleep - Inactive'" & nl
    s = s & "        $miStatus.Text = 'o  Status: Inactive'" & nl
    s = s & "        $miToggle.Text = '>>  Enable'" & nl
    s = s & "        $tray.BalloonTipIcon  = [System.Windows.Forms.ToolTipIcon]::None" & nl
    s = s & "        $tray.BalloonTipTitle = 'NoSleep Inactive'" & nl
    s = s & "        $tray.BalloonTipText  = 'Inactive'" & nl
    s = s & "        $tray.ShowBalloonTip(2000)" & nl
    s = s & "    }" & nl
    s = s & "}" & nl
    s = s & nl
    ' ---- Event: left click ----
    s = s & "$tray.Add_MouseClick({" & nl
    s = s & "    param($s, $e)" & nl
    s = s & "    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Invoke-Toggle }" & nl
    s = s & "})" & nl
    s = s & nl
    ' ---- Event: toggle menu item ----
    s = s & "$miToggle.Add_Click({ Invoke-Toggle })" & nl
    s = s & nl
    ' ---- Event: auto-start menu item ----
    s = s & "$miAutoStart.Add_Click({" & nl
    s = s & "    $exists = [bool](Get-ItemProperty -Path $script:RegPath -Name $script:RegName -ErrorAction SilentlyContinue)" & nl
    s = s & "    if ($exists) {" & nl
    s = s & "        Remove-ItemProperty -Path $script:RegPath -Name $script:RegName -ErrorAction SilentlyContinue" & nl
    s = s & "        [void][System.Windows.Forms.MessageBox]::Show(" & nl
    s = s & "            'Auto-start removed. NoSleep will no longer start with Windows.'," & nl
    s = s & "            'NoSleep', [System.Windows.Forms.MessageBoxButtons]::OK," & nl
    s = s & "            [System.Windows.Forms.MessageBoxIcon]::Information)" & nl
    s = s & "    } else {" & nl
    s = s & "        $regValue = 'wscript.exe ' + [char]34 + $script:VbsPath + [char]34" & nl
    s = s & "        Set-ItemProperty -Path $script:RegPath -Name $script:RegName -Value $regValue" & nl
    s = s & "        [void][System.Windows.Forms.MessageBox]::Show(" & nl
    s = s & "            'Auto-start enabled. NoSleep will now start automatically with Windows.'," & nl
    s = s & "            'NoSleep', [System.Windows.Forms.MessageBoxButtons]::OK," & nl
    s = s & "            [System.Windows.Forms.MessageBoxIcon]::Information)" & nl
    s = s & "    }" & nl
    s = s & "    Update-AutoStartMenu" & nl
    s = s & "})" & nl
    s = s & nl
    ' ---- Event: exit ----
    s = s & "$miExit.Add_Click({" & nl
    s = s & "    if ($script:IsActive) {" & nl
    s = s & "        $timer.Stop()" & nl
    s = s & "        [void][NoSleep.PowerUtil]::SetThreadExecutionState($script:FLAGS_RELEASE)" & nl
    s = s & "    }" & nl
    s = s & "    $tray.Visible = $false" & nl
    s = s & "    $tray.Dispose()" & nl
    s = s & "    [System.Windows.Forms.Application]::Exit()" & nl
    s = s & "})" & nl
    s = s & nl
    ' ---- Startup balloon ----
    s = s & "$tray.BalloonTipIcon  = [System.Windows.Forms.ToolTipIcon]::Info" & nl
    s = s & "$tray.BalloonTipTitle = 'NoSleep Ready'" & nl
    s = s & "$tray.BalloonTipText  = 'Left click: Enable/Disable  |  Right click: Menu'" & nl
    s = s & "$tray.ShowBalloonTip(3000)" & nl
    s = s & nl
    ' ---- Message loop ----
    s = s & "[System.Windows.Forms.Application]::Run()" & nl

    BuildScript = s
End Function
