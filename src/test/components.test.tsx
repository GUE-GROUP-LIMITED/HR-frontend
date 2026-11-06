import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { SlaGauge } from '@/components/dashboard/SlaGauge'

describe('GUE HR UI Components', () => {
  describe('Badge component', () => {
    it('renders with children text', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('applies variant styling', () => {
      const { container } = render(<Badge variant="success">Active</Badge>)
      expect(container.firstChild).toHaveClass('bg-emerald-50')
    })
  })

  describe('Button component', () => {
    it('renders button with text and triggers onClick', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)

      const btn = screen.getByRole('button', { name: /click me/i })
      expect(btn).toBeInTheDocument()
      fireEvent.click(btn)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('respects disabled prop', () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      )

      const btn = screen.getByRole('button', { name: /disabled button/i })
      expect(btn).toBeDisabled()
      fireEvent.click(btn)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Avatar component', () => {
    it('renders initials when no src image is given', () => {
      render(<Avatar fallback="Elena Rostova" />)
      expect(screen.getByText('ER')).toBeInTheDocument()
    })
  })

  describe('SlaGauge component', () => {
    it('renders score text and benchmark comparison', () => {
      render(<SlaGauge score={94.2} lastMonthScore={85.8} />)
      expect(screen.getAllByText('94.2%').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('85.8%')).toBeInTheDocument()
      expect(screen.getByText(/higher than corporate benchmark/i)).toBeInTheDocument()
    })
  })
})
