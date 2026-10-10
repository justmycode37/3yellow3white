import type { ColorPalette } from 'animlib'

// Scenes keep their authored tokens; only the display palette changes.
export function lessonTheme(theme: 'light' | 'dark', palette: ColorPalette): ColorPalette {
  return {
    ...palette,
    background: 'BLACK',
    foreground: 'WHITE',
    colors: theme === 'dark' ? { ...palette.colors, BLACK: '#000000', WHITE: '#ffffff' } : {
      ...palette.colors,
      BLACK: '#ffffff', WHITE: '#000000',
      GREY_A: '#222222', GREY_B: '#444444', GREY_C: '#777777',
      GREY: '#777777', GREY_D: '#bbbbbb', GREY_E: '#dddddd',
    },
  }
}
