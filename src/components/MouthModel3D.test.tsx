// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MouthModel3D } from './MouthModel3D'
import { uiCopy } from '../i18n'

vi.mock('three', async (importOriginal) => ({
  ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: class {
    constructor() { throw new TypeError('getShaderPrecisionFormat returned null') }
  },
}))

afterEach(cleanup)

describe('unavailable graphics hardware', () => {
  it('keeps the learning screen and sound controls usable when GPU initialization throws', async () => {
    render(<MouthModel3D copy={uiCopy('en').model} />)
    expect(await screen.findByTestId('mouth-model-fallback')).toHaveTextContent(uiCopy('en').model.unavailable)
    fireEvent.click(screen.getByTestId('model-sound-n'))
    expect(screen.getByTestId('mouth-model')).toHaveAttribute('data-sound', 'N')
    expect(screen.getByText(uiCopy('en').model.nAir)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('model-sound-l'))
    expect(screen.getByTestId('mouth-model')).toHaveAttribute('data-sound', 'L')
  })
})
