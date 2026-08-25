/** 安卓手势与快捷操作说明弹窗（高阶菜单「快捷键说明」入口）。 */
interface AndroidGestureHelpProps {
  open: boolean
  onClose: () => void
}

const GESTURES: { icon: string; name: string; desc: string }[] = [
  { icon: 'fa-solid fa-hand-pointer', name: '单指拖动空白处', desc: '移动地图视角' },
  { icon: 'fa-solid fa-hand-pointer', name: '单指点击图形', desc: '选中图形，选中框上可调整样式、删除、锁定' },
  { icon: 'fa-solid fa-up-down-left-right', name: '单指按住图形拖动', desc: '移动图形位置；套索圈选后可整体移动' },
  { icon: 'fa-solid fa-paintbrush', name: '单指绘制', desc: '选择画笔/直线/箭头等工具后，按住拖动即可绘制' },
  { icon: 'fa-solid fa-expand', name: '双指捏合', desc: '缩放地图；在选中的图形上捏合可整体缩放图形' },
  { icon: 'fa-solid fa-draw-polygon', name: '套索圈选', desc: '圈住多个图形后可整体移动、删除，或「作为群组锁定」' },
  { icon: 'fa-solid fa-lock', name: '锁定 / 群组锁定', desc: '锁定后图形不可移动、编辑、擦除；点解锁按钮恢复' },
  { icon: 'fa-solid fa-hand-holding', name: '长按锁定按钮', desc: '查看该按钮的功能说明（不会触发锁定）' },
  { icon: 'fa-solid fa-rotate', name: '旋转手柄', desc: '选中干员/载具/建筑后，按住旋转图标拖动即可调整朝向' },
  { icon: 'fa-solid fa-gun', name: '长按枪线按钮', desc: '拖动滑杆调整枪线长度；点按为开关枪线' },
  { icon: 'fa-solid fa-route', name: '绘制路线', desc: '逐点确立路径，底部按钮可撤销节点、完成或取消' },
  { icon: 'fa-solid fa-location-dot', name: '点击路线节点', desc: '删除该途经点（桌面端为右键删除）' },
  { icon: 'fa-solid fa-rotate-left', name: '撤销 / 恢复 / 删除', desc: '使用顶部工具栏按钮（移动端无键盘快捷键）' },
  { icon: 'fa-solid fa-circle-xmark', name: '点击空白处', desc: '取消当前选中' },
]

/**
 * 安卓手势说明：内置常用触控手势与简明说明，
 * 替代桌面端的键盘快捷键说明（移动端无物理键盘）。
 */
export default function AndroidGestureHelp({ open, onClose }: AndroidGestureHelpProps) {
  if (!open) return null
  return (
    <div className="tb-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className="tb-modal gesture-help-modal">
        <div className="tb-head">
          <span className="tb-title">手势与快捷操作</span>
          <button className="tb-close" onClick={onClose} title="关闭" aria-label="关闭">×</button>
        </div>
        <div className="tb-body gesture-help-body">
          {GESTURES.map((item) => (
            <div key={item.name} className="gesture-help-row">
              <span className="gesture-help-icon"><i className={item.icon} aria-hidden="true" /></span>
              <span className="gesture-help-name">{item.name}</span>
              <span className="gesture-help-desc">{item.desc}</span>
            </div>
          ))}
          <div className="tb-tip">提示：移动端没有键盘快捷键，撤销/恢复/删除等操作请使用工具栏按钮。</div>
        </div>
      </div>
    </div>
  )
}
