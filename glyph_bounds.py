#!/usr/bin/env python3
"""
Compute EXACT pixel-level bounding boxes for Persian letters
from the Vazirmatn Bold WOFF font, matching the canvas rendering:
  - fontSize = round(300 * 0.78) = 234
  - textBaseline = 'middle'
  - textAlign = 'center'
  - canvas: 300x300
  - cy = round(300 * 0.62) = 186 (middle point)
  - cx = 150
"""

from fontTools.ttLib import TTFont
import struct, zlib, io

WOFF_PATH = '/tmp/package/files/vazirmatn-arabic-700-normal.woff'
SIZE = 300
FONT_SIZE = round(SIZE * 0.78)  # 234
CY = round(SIZE * 0.62)         # 186
CX = SIZE // 2                  # 150

LETTERS = ['آ','ا','ب','پ','ت','ث','ج','چ','ح','خ','د','ذ','ر','ز','ژ','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ک','گ','ل','م','ن','و','ه','ی']

# Convert WOFF to OTF bytes so fonttools can parse it
def woff_to_otf(path):
    with open(path, 'rb') as f:
        data = f.read()
    sig, flavor, length = struct.unpack_from('>4sII', data, 0)
    assert sig == b'wOFF', f"Not WOFF: {sig}"
    numTables, reserved = struct.unpack_from('>HH', data, 12)
    totalSfntSize = struct.unpack_from('>I', data, 16)[0]
    majorVersion, minorVersion = struct.unpack_from('>HH', data, 24)

    tables = {}
    offset = 44  # WOFF header is 44 bytes
    for _ in range(numTables):
        tag, off, comp_len, orig_len, checksum = struct.unpack_from('>4sIIII', data, offset)
        tag = tag.decode('ascii')
        table_data = data[off:off+comp_len]
        if comp_len < orig_len:
            table_data = zlib.decompress(table_data)
        tables[tag] = table_data
        offset += 20

    # Build SFNT (TTF/OTF) from tables
    n = len(tables)
    searchRange = 1
    while searchRange * 2 <= n:
        searchRange *= 2
    searchRange *= 16
    entrySelector = (searchRange // 16).bit_length() - 1
    rangeShift = n * 16 - searchRange

    sfnt = struct.pack('>IHHHH', 0x00010000, n, searchRange, entrySelector, rangeShift)
    sorted_tags = sorted(tables.keys())

    # Calculate offsets
    table_offset = 12 + n * 16
    checksum_offset = None

    # Build directory + data
    dir_data = b''
    tbl_data = b''
    for tag in sorted_tags:
        tbl = tables[tag]
        # Pad to 4-byte alignment
        padded = tbl + b'\x00' * ((4 - len(tbl) % 4) % 4)
        # Simple checksum calc
        cs = 0
        for i in range(0, len(padded), 4):
            cs = (cs + struct.unpack_from('>I', padded, i)[0]) & 0xFFFFFFFF
        dir_data += struct.pack('>4sIII', tag.encode(), cs, table_offset, len(tbl))
        tbl_data += padded
        table_offset += len(padded)

    return sfnt + dir_data + tbl_data

# Parse the WOFF font
otf_bytes = woff_to_otf(WOFF_PATH)
font = TTFont(io.BytesIO(otf_bytes))

# Font metrics
em = font['head'].unitsPerEm
ascender = font['OS/2'].sTypoAscender
descender = font['OS/2'].sTypoDescender  # negative

scale = FONT_SIZE / em

# textBaseline='middle': y coordinate (cy) is at the VISUAL MIDDLE of the em box
# Middle of em box above baseline = (ascender + descender) / 2 font units
# (descender is negative, so this is (2100 + -1100)/2 = 500 units above baseline)
# In canvas coords (y increases downward): baseline = cy + middle_offset_in_pixels
# (because the middle is ABOVE baseline = LOWER y value in canvas)
baseline_y = CY + (ascender + descender) / 2 * scale
print(f"// Font: em={em}, ascender={ascender}, descender={descender}")
print(f"// Scale: {scale:.4f}, textBaseline='middle' cy={CY}")
print(f"// Baseline at canvas y={baseline_y:.1f}")
print()

cmap = font.getBestCmap()
glyf = font['glyf']
hmtx = font['hmtx']

def get_bounds_px(letter):
    codepoint = ord(letter)
    if codepoint not in cmap:
        return None
    gname = cmap[codepoint]

    if gname not in glyf.glyphs:
        return None

    g = glyf[gname]
    if not hasattr(g, 'numberOfContours') or g.numberOfContours == 0:
        return None

    # Get glyph bounding box in font units
    try:
        bounds = g.recalcBounds(glyf)
        xMin, yMin, xMax, yMax = g.xMin, g.yMin, g.xMax, g.yMax
    except:
        return None

    advance_width = hmtx[gname][0]
    lsb = hmtx[gname][1]

    # Convert to canvas coordinates
    # CX is center, letter drawn with textAlign='center'
    # So the left edge of the advance box is at: CX - advance_width * scale / 2
    left_canvas = CX - advance_width * scale / 2

    # x in canvas = left_canvas + (font_x - lsb + lsb) * scale?
    # Actually: x_canvas = left_canvas + font_x * scale - lsb * scale + lsb * scale
    # The bearing/lsb shifts the glyph within the advance box
    # glyph x coordinates start at lsb from the origin
    # origin in canvas = left_canvas
    # so canvas_x = left_canvas + glyph_x * scale
    # but glyph_x is in font units where glyph starts at xMin which is at lsb from origin
    # Actually in font coords: x=0 is the origin (pen position), x=lsb is where glyph starts (xMin)

    canvas_xMin = left_canvas + xMin * scale
    canvas_xMax = left_canvas + xMax * scale

    # y conversion: font y+ is up, canvas y+ is down
    # font y=0 is baseline
    # canvas baseline = baseline_y
    # canvas_y = baseline_y - font_y * scale
    canvas_yMin = baseline_y - yMax * scale  # font yMax → canvas top (smallest y)
    canvas_yMax = baseline_y - yMin * scale  # font yMin → canvas bottom (largest y)

    return {
        'mnX': round(canvas_xMin),
        'mxX': round(canvas_xMax),
        'mnY': round(canvas_yMin),
        'mxY': round(canvas_yMax),
        'cx': round((canvas_xMin + canvas_xMax) / 2),
        'cy_center': round((canvas_yMin + canvas_yMax) / 2),
        'advance': advance_width,
    }

for letter in LETTERS:
    b = get_bounds_px(letter)
    if b:
        print(f"'{letter}': x[{b['mnX']}-{b['mxX']}] y[{b['mnY']}-{b['mxY']}] {b['mxX']-b['mnX']}x{b['mxY']-b['mnY']} center=({b['cx']},{b['cy_center']})")
    else:
        print(f"'{letter}': NOT FOUND or empty")
