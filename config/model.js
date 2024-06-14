const modelList = [
  {
    name: "科技展厅",
    key: "glb-27",
    fileType: "glb",
    id: 27,
    animation: false,
    filePath: "models/glb/glb-27.glb",
    icon: "images/model-icon/21.jpg",
    decomposeName: "glb-27",
  },
  {
    name: "电脑",
    key: "glb-28",
    fileType: "glb",
    id: 28,
    animation: false,
    filePath: "models/glb/glb-28.glb",
    icon: "images/model-icon/19.png",
    decomposeName: "glb-28",
  },
  {
    name: "植物",
    key: "glb-29",
    fileType: "glb",
    id: 29,
    animation: false,
    filePath: "models/glb/glb-29.glb",
    icon: "images/model-icon/20.png",
    decomposeName: "glb-29",
  },
];

// 几何体模型列表
const geometryModelList = [
  {
    id: 30,
    name: "立方体",
    modelType: "geometry",
    type: "BoxGeometry",
    width: 1, // X轴上面的宽度
    height: 1, // Y轴上面的高度
    depth: 1, // 轴上面的深度
    widthSegments: 1, //宽度的分段数
    heightSegments: 1, //高度的分段数
    depthSegments: 1, //深度的分段数
  },
  {
    id: 31,
    name: "胶囊",
    modelType: "geometry",
    type: "CapsuleGeometry",
    radius: 0.5, // 胶囊半径
    length: 0.5, //中间区域的长度
    capSegments: 10, // 构造盖子的曲线部分的个数
    radialSegments: 10, //覆盖胶囊圆周的分离的面的个数
  },
  {
    id: 32,
    name: "圆形",
    modelType: "geometry",
    type: "CircleGeometry",
    radius: 0.5, // 半径
    segments: 32, //分段（三角面）的数量
    thetaStart: 0, // 第一个分段的起始角度
    thetaLength: 6.44, //圆形扇区的中心角
  },
  {
    id: 33,
    name: "圆锥",
    modelType: "geometry",
    type: "ConeGeometry",
    radius: 0.5, // 半径
    height: 1, //圆锥的高度
    radialSegments: 8, // 圆锥侧面周围的分段数
    heightSegments: 1, //圆形扇区的中心角
    openEnded: false, //指明该圆锥的底面是开放的还是封顶的
    thetaStart: 0,
    thetaLength: 6.44, //圆形扇区的中心角
  },
  {
    id: 35,
    name: "十二面体",
    modelType: "geometry",
    type: "DodecahedronGeometry",
    radius: 0.5,
    detail: 0,
  },
  {
    id: 36,
    name: "二十面体",
    modelType: "geometry",
    type: "IcosahedronGeometry",
    radius: 0.5,
    detail: 0,
  },
  {
    id: 37,
    name: "八面体",
    modelType: "geometry",
    type: "OctahedronGeometry",
    radius: 0.5,
    detail: 0,
  },
  {
    id: 38,
    name: "平面",
    modelType: "geometry",
    type: "PlaneGeometry",
    width: 1, // X轴上面的宽度
    height: 1, // Y轴上面的高度
    widthSegments: 1, //宽度的分段数
    heightSegments: 1, //高度的分段数
  },
  {
    id: 40,
    name: "球",
    modelType: "geometry",
    type: "SphereGeometry",
    radius: 0.5,
    widthSegments: 32,
    heightSegments: 16,
    phiStart: 0,
    phiLength: 6,
    thetaStart: 0,
    thetaLength: 7,
  },
  {
    id: 41,
    name: "四面体",
    modelType: "geometry",
    type: "TetrahedronGeometry",
    radius: 0.5,
    detail: 0,
  },
  {
    id: 42,
    name: "圆环",
    modelType: "geometry",
    type: "TorusGeometry",
    radius: 0.5,
    tube: 0.1,
    radialSegments: 15,
    tubularSegments: 15,
    arc: 6.32,
  },
];

export { modelList, geometryModelList };
