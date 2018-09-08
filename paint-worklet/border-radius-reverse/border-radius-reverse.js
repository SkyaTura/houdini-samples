class BorderRadiusReversePainter {
  static get sidesProperties () {
    return [
      '--border-radius-reverse-top-left',
      '--border-radius-reverse-top-right',
      '--border-radius-reverse-bottom-right',
      '--border-radius-reverse-bottom-left',
    ]
  }
  static get inputProperties(){
    return [
      '--border-radius-reverse',
      '--border-radius-reverse-color',
      ...BorderRadiusReversePainter.sidesProperties,
    ]
  }
  static fallbackArray (base, ...indexes) {
    return base[[...indexes, 0].find(index => base[index] !== undefined)]
  }
  static sanitizePropertySet (property) {
    return property.split(' ').filter(value => value !== '')
  }
  static parseUnit (value) {
    return new CSSUnitValue(...value.match(/(\d{1,})|(.{1,})/g))
  }
  extractSides (property) {
    const values = BorderRadiusReversePainter.sanitizePropertySet(property)
    const count = values.length
    if (count > 4) throw 'Too many arguments'
    const getValue = (...indexes) => BorderRadiusReversePainter.fallbackArray(values, ...indexes)
    return [
      values[0],
      getValue(1),
      getValue(2),
      count === 2 ? values[1] : count === 3 ? values[2] : getValue(3),
    ].map(BorderRadiusReversePainter.parseUnit)
  }
  extractShorthand (props) {
    try {
      const shorthand = props.get('--border-radius-reverse').toString().split('/')
      const count = shorthand.length
      if (count < 1 || count > 2) return 
      const shortHandedX = this.extractSides(shorthand[0])
      const shortHandedY = count > 1 ? this.extractSides(shorthand[1]) : shortHandedX
      return [0,1,2,3].reduce((acc, i) => ([
        ...acc, 
        [ shortHandedX[i], shortHandedY[i] ],
      ]), [])
    } catch (e) {
      return [undefined, undefined, undefined, undefined]
    }
  }
  extractExplicits (props) {
    return BorderRadiusReversePainter.sidesProperties.map(side => {
      const axis = BorderRadiusReversePainter.sanitizePropertySet(props.get(side).toString())
      const count = axis.length
      if (count < 1 || count > 2) return undefined
      return [
        axis[0],
        BorderRadiusReversePainter.fallbackArray(axis, 1),
      ].map(BorderRadiusReversePainter.parseUnit)
    })
  }
  computeProperties (props) {
    const shorthanded = this.extractShorthand(props)
    const explicit = this.extractExplicits(props)
    const getValue = index => {
      if (explicit[index] !== undefined) return explicit[index]
      if (shorthanded[index] !== undefined) return shorthanded[index]
      throw 'Missing parameters'
    }
    return [
      getValue(0),
      getValue(1),
      getValue(2),
      getValue(3),
    ]
  }
  fixRadii (values, { height, width }) {
    // TODO: Validate units
    // TODO: Fix percentual coordinates
    const radii = values.map(([x, y]) => [x.value, y.value])
    const factorX = Math.min(
      1,
      width / (radii[0][0] + radii[1][0]),
      width / (radii[2][0] + radii[3][0]),
    )
    const factorY = Math.min(
      1,
      height / (radii[0][1] + radii[3][1]),
      height / (radii[1][1] + radii[2][1]),
    )
    return (factorX > 1 || factorY > 1) ? radii : radii.map(corner => ([
      corner[0] * factorX,
      corner[1] * factorY,
    ]))
  }

  clearCircle(context,x,y,[radiusX, radiusY]) {
    context.save();
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI);
    context.clip();
    context.clearRect(x - radiusX,y - radiusY,radiusX*2,radiusY*2);
    context.restore();
  }

  paint(ctx, geom, props){
    const computedRadius = this.computeProperties(props)
    const fixedRadius = this.fixRadii(computedRadius, geom)

    ctx.fillStyle = props.get('--border-radius-reverse-color').toString();
    ctx.fillRect(0, 0, geom.width, geom.height);

    this.clearCircle(ctx, 0, 0, fixedRadius[0]) // Left top
    this.clearCircle(ctx, geom.width, 0, fixedRadius[1]) // Right top
    this.clearCircle(ctx, geom.width, geom.height, fixedRadius[2]) // Right bottom
    this.clearCircle(ctx, 0, geom.height, fixedRadius[3]) // Left bottom
  }
}

registerPaint('border-radius-reverse', BorderRadiusReversePainter);
