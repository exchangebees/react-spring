import React from 'react'
import PropTypes from 'prop-types'
import Spring from './Spring'
import Trail from './Trail'
import Transition from './Transition'
import { getForwardProps } from './targets/shared/helpers'

const DEFAULT = '__default'

class Keyframes extends React.PureComponent {
  static propTypes = { state: PropTypes.string }
  static defaultProps = { state: DEFAULT }

  guid = 0
  state = { props: {}, oldProps: {}, resolve: () => null }

  componentDidMount() {
    this.componentDidUpdate({})
  }

  next = props => {
    this.running = true
    return new Promise(resolve => {
      this.setState(
        state => ({
          props,
          oldProps: { ...this.state.props },
          resolve,
        }),
        () => (this.running = false)
      )
    })
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.state !== this.props.state ||
      (this.props.reset && !this.running)
    ) {
      const { states, filter: f, state } = this.props
      if (states && state) {
        const localId = ++this.guid
        const slots = states[state]
        if (slots) {
          if (Array.isArray(slots)) {
            let q = Promise.resolve()
            for (let s of slots) {
              q = q.then(() => localId === this.guid && this.next(f(s)))
            }
          } else if (typeof slots === 'function') {
            slots(
              props => localId === this.guid && this.next(f(props)),
              this.props
            )
          } else {
            this.next(f(states[state]))
          }
        }
      }
    }
  }

  render() {
    const { props, oldProps, resolve } = this.state
    const { primitive: Component, from: ownFrom, onRest, ...rest } = this.props

    const current = this.instance && this.instance.getValues()
    const from =
      typeof props.from === 'function'
        ? props.from
        : { ...oldProps.from, ...current, ...props.from }

    return props ? (
      <Component
        ref={ref => (this.instance = ref)}
        {...rest}
        {...props}
        from={{ ...from, ...ownFrom }}
        onRest={args => {
          resolve(args)
          if (onRest) onRest(args)
        }}
      />
    ) : null
  }

  static create = primitive => (states, filter = states => states) => {
    if (typeof states === 'function' || Array.isArray(states))
      states = { [DEFAULT]: states }
    return props => (
      <Keyframes
        primitive={primitive}
        states={states}
        filter={filter}
        {...props}
      />
    )
  }
}

const interpolateTo = props => {
  const forward = getForwardProps(props)
  const rest = Object.keys(props).reduce(
    (acc, key) => (forward[key] ? acc : { ...acc, [key]: props[key] }),
    {}
  )
  return { to: forward, ...rest }
}

Keyframes.Spring = Keyframes.create(Spring)
Keyframes.Spring.to = states => Keyframes.Spring(states, interpolateTo)
Keyframes.Trail = Keyframes.create(Trail)
Keyframes.Trail.to = states => Keyframes.Trail(states, interpolateTo)
Keyframes.Transition = Keyframes.create(Transition)

export default Keyframes
