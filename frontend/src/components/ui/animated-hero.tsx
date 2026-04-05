import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROTATE_MS = 2000

export function Hero() {
  const [titleNumber, setTitleNumber] = useState(0)
  const titles = useMemo(
    () => ['smarter', 'safer', 'prepared', 'informed', 'sun-aware'],
    [],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTitleNumber((n) => (n === titles.length - 1 ? 0 : n + 1))
    }, ROTATE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [titleNumber, titles.length])

  const currentWord = titles[titleNumber]

  return (
    <div className="w-full">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-center gap-6 py-6 md:gap-8 md:py-8">
          <div className="flex flex-col gap-5">
            <h1 className="mx-auto max-w-4xl text-center text-5xl leading-tight tracking-tight md:text-7xl md:leading-[1.08]">
              <span className="block text-teal-200">Suntology helps you stay</span>
              <span
                className="relative mt-2 block min-h-[3.25rem] w-full overflow-hidden md:mt-3 md:min-h-[5.25rem]"
                aria-live="polite"
                aria-atomic="true"
              >
                {titles.map((title, index) => (
                  <motion.span
                    key={title}
                    className="absolute inset-x-0 text-center font-semibold text-white"
                    initial={{ opacity: 0, y: -100 }}
                    transition={{ type: 'spring', stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
                <span className="sr-only">{currentWord}</span>
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed tracking-tight text-white/75 md:text-xl">
              Plan around UV peaks, check coverage, and stay aware of burn risk.
            </p>
          </div>

          <div className="flex flex-row flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" variant="outline" asChild>
              <Link to="/learn">
                <BookOpen className="size-4" aria-hidden />
                Learn More
                
              </Link>
            </Button>
            <Button
              size="lg"
              className="gap-2 border-transparent bg-[#5FC3AF] font-semibold !text-zinc-950 shadow-sm visited:!text-zinc-950 hover:bg-[#6dccc0] hover:!text-zinc-950 focus-visible:ring-2 focus-visible:ring-teal-900/25 [&_svg]:!text-zinc-950 [&_svg]:!stroke-zinc-950"
              asChild
            >
              <Link to="/uv">
                Open UV Planner
                <Sun className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
