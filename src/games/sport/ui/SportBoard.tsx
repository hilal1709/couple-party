import type { GameProps } from '../../types'
import type { SportAction, SportState } from '../types'
import { ArcheryBoard } from './ArcheryBoard'
import { BowlingBoard } from './BowlingBoard'
import { BoxingBoard } from './BoxingBoard'
import { PenaltyBoard } from './PenaltyBoard'
import { RacketBoard } from './RacketBoard'

const BOARDS = { bowling: BowlingBoard, boxing: BoxingBoard, archery: ArcheryBoard, penalty: PenaltyBoard, racket: RacketBoard }

export function SportBoard(props: GameProps<SportState, SportAction>) {
  const Board = BOARDS[props.state.m.kind]
  return <Board {...props} />
}
