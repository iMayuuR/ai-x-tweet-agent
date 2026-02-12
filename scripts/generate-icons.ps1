Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [float]$x,
        [float]$y,
        [float]$w,
        [float]$h,
        [float]$r
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    if ($r -le 0) {
        $path.AddRectangle((New-Object System.Drawing.RectangleF($x, $y, $w, $h)))
        return $path
    }

    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-XAITweetIcon {
    param(
        [int]$Size,
        [string]$OutPath,
        [bool]$Maskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)

    $bg1 = [System.Drawing.Color]::FromArgb(6, 10, 22)
    $bg2 = [System.Drawing.Color]::FromArgb(12, 27, 55)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $bg1, $bg2, 45)

    if ($Maskable) {
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
    } else {
        $radius = [float]($Size * 0.22)
        $bgPath = New-RoundedRectPath -x 0 -y 0 -w $Size -h $Size -r $radius
        $g.FillPath($bgBrush, $bgPath)

        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55, 153, 211, 255), [float]($Size * 0.02))
        $g.DrawPath($borderPen, $bgPath)

        $borderPen.Dispose()
        $bgPath.Dispose()
    }
    $bgBrush.Dispose()

    $accentRect = New-Object System.Drawing.RectangleF([float]($Size * 0.08), [float]($Size * 0.08), [float]($Size * 0.84), [float]($Size * 0.84))
    $accentBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush((New-Object System.Drawing.PointF[] @(
        (New-Object System.Drawing.PointF($accentRect.Left, $accentRect.Top)),
        (New-Object System.Drawing.PointF($accentRect.Right, $accentRect.Top)),
        (New-Object System.Drawing.PointF($accentRect.Right, $accentRect.Bottom)),
        (New-Object System.Drawing.PointF($accentRect.Left, $accentRect.Bottom))
    )))
    $accentBrush.CenterColor = [System.Drawing.Color]::FromArgb(55, 29, 155, 240)
    $accentBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 29, 155, 240), [System.Drawing.Color]::FromArgb(0, 29, 155, 240), [System.Drawing.Color]::FromArgb(0, 29, 155, 240), [System.Drawing.Color]::FromArgb(0, 29, 155, 240))
    $g.FillRectangle($accentBrush, $accentRect)
    $accentBrush.Dispose()

    $pad = if ($Maskable) { [float]($Size * 0.2) } else { [float]($Size * 0.15) }
    $x1 = [float]($pad)
    $x2 = [float]($Size - $pad)
    $y1 = [float]($pad + ($Size * 0.02))
    $y2 = [float]($Size - $pad - ($Size * 0.04))

    $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 60, 195, 255), [float]($Size * 0.2))
    $glowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($glowPen, $x1, $y1, $x2, $y2)
    $g.DrawLine($glowPen, $x2, $y1, $x1, $y2)
    $glowPen.Dispose()

    $lineRect = New-Object System.Drawing.RectangleF($x1, $y1, ($x2 - $x1), ($y2 - $y1))
    $xGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($lineRect, [System.Drawing.Color]::FromArgb(88, 245, 255), [System.Drawing.Color]::FromArgb(50, 130, 255), 45)
    $xPen = New-Object System.Drawing.Pen($xGrad, [float]($Size * 0.11))
    $xPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $xPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($xPen, $x1, $y1, $x2, $y2)
    $g.DrawLine($xPen, $x2, $y1, $x1, $y2)
    $xPen.Dispose()
    $xGrad.Dispose()

    if ($Size -ge 48) {
        $badgeW = [float]($Size * 0.28)
        $badgeH = [float]($Size * 0.19)
        $badgeX = [float]($Size - $pad - ($badgeW * 0.9))
        $badgeY = [float]($Size - $pad - ($badgeH * 0.75))

        $badgePath = New-RoundedRectPath -x $badgeX -y $badgeY -w $badgeW -h $badgeH -r ([float]($badgeH * 0.35))
        $badgeFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 8, 18, 40))
        $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 70, 225, 255), [float]([Math]::Max(1, $Size * 0.012)))
        $g.FillPath($badgeFill, $badgePath)
        $g.DrawPath($badgePen, $badgePath)

        $fontSize = [float]([Math]::Max(8, $Size * 0.09))
        $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 235, 248, 255))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("AI", $font, $textBrush, (New-Object System.Drawing.RectangleF($badgeX, $badgeY, $badgeW, $badgeH)), $sf)

        $sf.Dispose()
        $textBrush.Dispose()
        $font.Dispose()
        $badgePen.Dispose()
        $badgeFill.Dispose()
        $badgePath.Dispose()
    }

    $dir = Split-Path -Parent $OutPath
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    if ($OutPath.ToLower().EndsWith(".ico")) {
        $tmpPng = "$OutPath.tmp.png"
        $bmp.Save($tmpPng, [System.Drawing.Imaging.ImageFormat]::Png)
        $iconBmp = [System.Drawing.Bitmap]::FromFile($tmpPng)
        $hIcon = $iconBmp.GetHicon()
        $icon = [System.Drawing.Icon]::FromHandle($hIcon)
        $fs = [System.IO.File]::Open($OutPath, [System.IO.FileMode]::Create)
        $icon.Save($fs)
        $fs.Close()
        $iconBmp.Dispose()
        Remove-Item $tmpPng -ErrorAction SilentlyContinue
    } else {
        $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $g.Dispose()
    $bmp.Dispose()
}

Draw-XAITweetIcon -Size 512 -OutPath "public/pwa-512x512.png" -Maskable:$false
Draw-XAITweetIcon -Size 192 -OutPath "public/pwa-192x192.png" -Maskable:$false
Draw-XAITweetIcon -Size 512 -OutPath "public/pwa-512x512-maskable.png" -Maskable:$true
Draw-XAITweetIcon -Size 192 -OutPath "public/pwa-192x192-maskable.png" -Maskable:$true
Draw-XAITweetIcon -Size 180 -OutPath "public/apple-touch-icon.png" -Maskable:$false
Draw-XAITweetIcon -Size 512 -OutPath "public/icon.png" -Maskable:$false
Draw-XAITweetIcon -Size 32 -OutPath "public/favicon-32x32.png" -Maskable:$false
Draw-XAITweetIcon -Size 16 -OutPath "public/favicon-16x16.png" -Maskable:$false
Draw-XAITweetIcon -Size 32 -OutPath "src/app/favicon.ico" -Maskable:$false
