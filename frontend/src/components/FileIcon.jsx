import {
  HiPhotograph, HiFilm, HiDocument, HiDocumentText, HiPaperClip
} from 'react-icons/hi'
import clsx from 'clsx'

const iconMap = {
  IMAGE:    { Icon: HiPhotograph,  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
  VIDEO:    { Icon: HiFilm,        color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30' },
  PDF:      { Icon: HiDocument,    color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/30' },
  DOCUMENT: { Icon: HiDocumentText,color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/30' },
  OTHER:    { Icon: HiPaperClip,   color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-700' },
}

const sizeMap = {
  sm: { container: 'w-8 h-8',   icon: 'text-base' },
  md: { container: 'w-10 h-10', icon: 'text-xl' },
  lg: { container: 'w-14 h-14', icon: 'text-3xl' },
}

export default function FileIcon({ type = 'OTHER', size = 'md' }) {
  const { Icon, color, bg } = iconMap[type] || iconMap.OTHER
  const { container, icon } = sizeMap[size]

  return (
    <div className={clsx('rounded-lg flex items-center justify-center', container, bg)}>
      <Icon className={clsx(icon, color)} />
    </div>
  )
}
