import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { de } from 'vuetify/locale'
import { BLACKBERRY, BLACKBERRY_DARK } from '@/data/profile'

export default createVuetify({
  locale: { locale: 'de', messages: { de } },
  theme: {
    defaultTheme: 'pbs_pfadiprofil',
    themes: {
      pbs_pfadiprofil: {
        dark: false,
        colors: {
          primary: BLACKBERRY,
          secondary: BLACKBERRY_DARK,
          background: '#F2EEF1',
          surface: '#FFFFFF',
          'surface-variant': '#E9E1E7',
          'on-background': '#231F20',
          'on-surface': '#231F20',
          error: '#B3261E',
          warning: '#B86125',
          success: '#4C6B47',
          info: '#2F5288',
          appbar: BLACKBERRY_DARK,
        },
        variables: {
          'border-color': '#5C264A',
          'hover-opacity': 0.06,
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto', color: 'primary' },
    VCombobox: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto', color: 'primary' },
    VFileInput: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto', color: 'primary' },
    VChip: { rounded: 'lg' },
  },
})
