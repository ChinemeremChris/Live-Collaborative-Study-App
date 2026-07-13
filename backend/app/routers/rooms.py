import logging
from fastapi import APIRouter, Depends, Query, Path, Body, Request, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from limiter import limiter
from users import current_active_user, current_optional_user, get_user_from_cookie
from db import get_async_session, async_session_maker, User, Room, RoomParticipant, RoomQuestion, RoomQuestionChoice, RoomAnswer, Card, Deck
from schemas import RoomOut, RoomParticipantOut, RoomChoiceOut, RoomQAOut, RoomInfoOut
from typing import Annotated
import uuid
from datetime import datetime, timezone
import random
import string
import asyncio
import time
import json

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/")
@limiter.limit("3/minute")
async def CreateRoom(request: Request, deck_id: Annotated[uuid.UUID, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).where(Deck.deck_id == deck_id)
        deck_result = await session.execute(deck_query)
        deck = deck_result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        if not deck.is_public and deck.creator_id != user.id:
            raise HTTPException(status_code=403, detail="Deck is privated by creator")
        characters = string.ascii_letters + string.digits
        while True:
            room_code = ''.join(random.choices(characters, k=6))
            existing_room_query = select(Room).where(Room.room_code == room_code)
            existing_room_result = await session.execute(existing_room_query)
            existing_room = existing_room_result.scalar_one_or_none()
            if not existing_room:
                break
        room = Room(
            host_id=user.id,
            deck_id=deck_id,
            room_code=room_code
        )
        session.add(room)
        await session.flush()
        await session.refresh(room)

        cards_query = select(Card).where(Card.deck_id == deck_id)
        cards_result = await session.execute(cards_query)
        cards = cards_result.scalars().all()
        for index, card in enumerate(cards, 0):
            other_answers = [{"definition": c.card_definition, "definition_url": c.card_definition_url, "is_correct": False} for c in cards if c.card_definition != card.card_definition]
            distractors = random.sample(other_answers, min(len(other_answers), 3))
            options = [{"definition": card.card_definition, "definition_url": card.card_definition_url, "is_correct": True}] + distractors
            random.shuffle(options)
            room_question = RoomQuestion(
                    room_id = room.room_id,
                    prompt = card.card_term,
                    prompt_url = card.card_term_url,
                    order_in_room = index
                )
            session.add(room_question)
            await session.flush()
            question_choices = [
                RoomQuestionChoice(
                    room_question_id = room_question.room_question_id,
                    choice_text = option["definition"],
                    choice_url = option["definition_url"],
                    is_correct = option["is_correct"],
                    choice_order = i
                )
                for i, option in enumerate(options, 0)
            ]
            session.add_all(question_choices)


        room_participant = RoomParticipant(
            participant_id = user.id,
            room_id = room.room_id
        )
        session.add(room_participant)
        await session.flush()
        await session.refresh(room_participant)
        await session.commit()
        return RoomOut(
            room_id=room.room_id,
            room_code=room_code,
            host_name=f"{user.fname} {user.lname}" if user.fname and user.lname else "Host info unavailable",
            deck_name=deck.deck_name,
            created_at=room.created_at,
            room_status=room.room_status,
            participant_count=1
        )
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"CreateRoom failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create room")
    
@router.post("/{room_code}/join")
@limiter.limit("3/minute")
async def JoinRoom(request: Request, room_code: Annotated[str, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        room_query = select(Room).where(Room.room_code == room_code)
        room_result = await session.execute(room_query)
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(status_code=404, detail="No such room exists")
        existing_query = select(RoomParticipant, Room).outerjoin(RoomParticipant.room).where(Room.room_code == room_code, RoomParticipant.participant_id == user.id)
        existing_result = await session.execute(existing_query)
        existing_join = existing_result.scalar_one_or_none()
        if existing_join:
            raise HTTPException(status_code=400, detail="You have already joined this room")
        if room.room_status == "Completed":
            raise HTTPException(status_code=403, detail="You cannot join this session")
        room_participant = RoomParticipant(
            participant_id = user.id,
            room_id = room.room_id
        )
        session.add(room_participant)
        await session.commit()
        return {"message": "Successfully joined room"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"JoinRoom failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to allow user join room")    

@router.get("/participants/me")
@limiter.limit("10/minute")
async def GetMyRooms(request: Request, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        rooms_query = select(Room, RoomParticipant).options(selectinload(Room.host), selectinload(Room.deck)).outerjoin(Room.participation).where(RoomParticipant.participant_id == user.id)
        rooms_result = await session.execute(rooms_query)
        rows = rooms_result.all()
        room_out_list = [
            RoomParticipantOut(
                room_code=row.Room.room_code,
                hosted_by="You" if row.Room.host.id == user.id else (f"{row.Room.host.fname} {row.Room.host.lname}" if not row.Room.host.is_deleted else "Deleted User"),
                deck_name=row.Room.deck.deck_name,
                created_at=row.Room.created_at,
                room_status=row.Room.room_status,
                score=row.RoomParticipant.score or None,
                placement=row.RoomParticipant.placement or None,
                can_delete=user.id==row.Room.host.id
            ) 
            for row in rows
        ]
        return room_out_list
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"GetMyRooms error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch rooms")
    
@router.get("/{room_id}")
@limiter.limit("5/minute")
async def GetRoomInfo(request: Request, room_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        room_query = select(Room).options(selectinload(Room.deck), selectinload(Room.participation).selectinload(RoomParticipant.participant), selectinload(Room.room_question).selectinload(RoomQuestion.question_choices)).where(Room.room_id == room_id)
        room_result = await session.execute(room_query)
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        is_participant = False
        for p in room.participation:
            if user.id == p.participant_id:
                is_participant = True
                break
        if not is_participant and user.id != room.host_id:
            raise HTTPException(status_code=403, detail="You were not a part of this room")
        responses_query = select(RoomAnswer, RoomQuestion).outerjoin(RoomAnswer.student_question).where(RoomQuestion.room_id == room_id, RoomAnswer.student_id == user.id)
        responses_result = await session.execute(responses_query)
        responses = responses_result.all()
        responses_dict = {
            row.RoomAnswer.room_question_id: row.RoomAnswer.answer_id
            for row in responses
        }
        scores = sorted(
            [
                {
                    "name": f"{player.participant.fname} {player.participant.lname}",
                    "score": player.score,
                    "placement": player.placement
                }
                for player in room.participation
            ], key= lambda x: int(x["placement"].split("/")[0]) if x["placement"] else 9999
        )
        room_questions = []
        for question in room.room_question:
            question_choices = []
            for choice in question.question_choices:
                question_choices.append(RoomChoiceOut(
                    choice_id=choice.choice_id,
                    choice_text=choice.choice_text,
                    choice_url=choice.choice_url,
                    is_correct=choice.is_correct,
                    is_player_choice = choice.choice_id == responses_dict.get(question.room_question_id, None)
                ))
            room_questions.append(RoomQAOut(
                room_question_id=question.room_question_id,
                prompt=question.prompt,
                prompt_url=question.prompt_url,
                choices=question_choices,
            ))
        return RoomInfoOut(
            room_id=room.room_id,
            deck_name=room.deck.deck_name if room.deck else "Deleted Deck",
            room_status=room.room_status,
            created_at=room.created_at,
            questions=room_questions,
            scores=scores
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetRoomInfo error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error loading room info")

            


    
@router.delete("/{room_id}")
@limiter.limit("10/minute")
async def DeleteRoom(request: Request, room_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        room_query = select(Room).where(Room.room_id == room_id)
        room_result = await session.execute(room_query)
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.host_id != user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this room")
        await session.delete(room)
        await session.commit()
        return {"message": "Room successfully deleted"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"DeleteRoom error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete room")
    
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, dict[uuid.UUID, WebSocket]] = {} #ABC123: {"uuid1": Websocket1, "uuid2": websocket2}
        self.room_states: dict[str, dict] = {}
        self.disconnected_users: dict[str, set] = {}

    async def connect(self, user_id: uuid.UUID, room_code: str, websocket: WebSocket):
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = {}
        if room_code not in self.disconnected_users:
            self.disconnected_users[room_code] = set()
        self.active_connections[room_code][user_id] = websocket
        if room_code not in self.room_states:
            self.room_states[room_code] = {
                "status": "Waiting",
                "questions": [],
                "pending_answers": [],
                "scores": {}, #user.id: {name: score}
                "current_index": 0,
                "answers": {}, #room_question_id: choice_id (for the correct choice)
                "interval": 60,
                "answered_users": {},
                "timer_task": None,
                "disconnect_cleanup": None
            }
        if self.room_states[room_code]["disconnect_cleanup"]:
            self.room_states[room_code]["disconnect_cleanup"].cancel()
        async with async_session_maker() as session:
            participant_query = select(RoomParticipant, Room).options(selectinload(RoomParticipant.participant)).outerjoin(RoomParticipant.room).where(RoomParticipant.participant_id == user_id, Room.room_code == room_code)
            participant_result = await session.execute(participant_query)
            player = participant_result.first()
        if not player:
            await self.send_personal_message(websocket, {"type": "error", "message": "Error connecting to the room"})
            return
        if user_id in self.disconnected_users[room_code]:
            self.disconnected_users[room_code].remove(user_id)
            if self.room_states[room_code]["status"] == "Active":
                await self.send_personal_message(websocket, {
                    "type": "resume",
                    "message": "Waiting to finish this round",
                    "current_question": self.room_states[room_code]["current_index"],
                    "scores": list(self.room_states[room_code]["scores"].values())
                })
                return
        self.room_states[room_code]["scores"][str(user_id)] = {"score": 0, "name": f"{player.RoomParticipant.participant.fname} {player.RoomParticipant.participant.lname}"}
    
    async def disconnect(self, user_id, room_code, websocket: WebSocket):
        self.disconnected_users[room_code].add(user_id)
        self.active_connections[room_code].pop(user_id, None)
        if len(self.active_connections[room_code].values()) <= 0:
            if not self.room_states[room_code]["disconnect_cleanup"]:
                self.room_states[room_code]["disconnect_cleanup"] = asyncio.create_task(self.cleanup(room_code))
    
    async def cleanup(self, room_code):
        try:
            await asyncio.sleep(120)
        except asyncio.CancelledError:
            return
        if room_code not in self.active_connections or len(self.active_connections[room_code].values()) <= 0:
            self.active_connections.pop(room_code, None)
            self.room_states.pop(room_code, None)
            self.disconnected_users.pop(room_code, None)
        

    async def broadcast(self, room_code, message: dict):
        if room_code not in self.active_connections:
            return

        for connection in self.active_connections[room_code].values():
            await connection.send_json(message)

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        await websocket.send_json(message)

manager = ConnectionManager()

async def EndGame(room_code):
    if room_code not in manager.room_states:
        return
    final_scores = list(manager.room_states[room_code]["scores"].values())
    try:
        async with async_session_maker() as session:
            room_query = select(Room).where(Room.room_code == room_code)
            room_result = await session.execute(room_query)
            room = room_result.scalar_one_or_none()
            if not room:
                await manager.broadcast(room_code, {"type": "error", "message": "Room could not be found. Progress not saved"})
                return
            if manager.room_states[room_code]["pending_answers"]:
                pending_answers = [RoomAnswer(
                    student_id = pending.get("student_id"),
                    room_question_id = pending.get("room_question_id"),
                    answer_id = pending.get("answer_id"),
                    is_correct = pending.get("is_correct")
                ) for pending in manager.room_states[room_code]["pending_answers"]]
                session.add_all(pending_answers)
                await session.flush()
                manager.room_states[room_code]["pending_answers"].clear()
            room.room_status = "Completed"
            if manager.room_states[room_code]["scores"]:
                scores_list = list(manager.room_states[room_code]["scores"].items())
                scores_list = sorted(scores_list, key=lambda x: x[1]["score"], reverse=True)
                scores_dict = {score[0]: {"score": score[1]["score"], "placement": index} for index, score in enumerate(scores_list, 1)}
                participants_query = select(RoomParticipant).where(RoomParticipant.room_id == room.room_id)
                participants_result = await session.execute(participants_query)
                participants = participants_result.scalars().all()
                for p in participants:
                    p.score = scores_dict.get(str(p.participant_id), {}).get("score", 0)
                    p.placement = f"{scores_dict.get(str(p.participant_id), {}).get('placement', '')}/{len(scores_list)}"
                await session.flush()
            await session.commit()
    except Exception as e:
        logger.error(f"EndGame DB error: {e}", exc_info=True)
            
    await manager.broadcast(room_code, {"type": "end_game", "message": "Game ended", "scores": final_scores})
    manager.room_states.pop(room_code, None)

async def NextQuestion(room_code, next_index):
    await asyncio.sleep(10)
    if room_code not in manager.room_states:
        return
    if manager.room_states[room_code]["current_index"] != next_index:
        return
    current_index = manager.room_states[room_code]["current_index"]
    if current_index < len(manager.room_states[room_code]["questions"]) - 1:
        question_choices = [{"choice_id": str(choice.choice_id), "choice": choice.choice_text, "choice_url": choice.choice_url} for choice in manager.room_states[room_code]["questions"][current_index].question_choices]
        manager.room_states[room_code]["answered_users"][current_index] = set()

        await manager.broadcast(room_code, {"type": "question",
                                            "prompt": manager.room_states[room_code]["questions"][current_index].prompt,
                                            "prompt_url": manager.room_states[room_code]["questions"][current_index].prompt_url,
                                            "choices": question_choices,
                                            "ends_at": int((time.time() + manager.room_states[room_code]["interval"]) * 1000)})
        manager.room_states[room_code]["timer_task"] = asyncio.create_task(QuestionTimer(room_code, manager.room_states[room_code]["interval"], current_index))
    else:
        manager.room_states[room_code]["timer_task"].cancel()
        asyncio.create_task(EndGame(room_code))
        return

async def ShowRoundResults(room_code, question_index):
    if room_code not in manager.room_states:
        return
    current_index = manager.room_states[room_code]["current_index"]
    if current_index != question_index:
        return
    room_question_id = manager.room_states[room_code]["questions"][current_index].room_question_id
    manager.room_states[room_code]["current_index"] += 1
    
    await manager.broadcast(room_code, {
        "type": "round_results",
        "correct_answer_id": str(manager.room_states[room_code]["answers"][room_question_id]),
        "scores": list(manager.room_states[room_code]["scores"].values())
    })
    asyncio.create_task(NextQuestion(room_code, question_index+1))

async def QuestionTimer(room_code, interval, question_index):
    try:
        await asyncio.sleep(interval)
    except asyncio.CancelledError:
        return
    if room_code not in manager.room_states:
        return
    if question_index == manager.room_states[room_code]["current_index"]:
        asyncio.create_task(ShowRoundResults(room_code, question_index))
    

@router.websocket("/{room_code}/ws")
async def WebsocketEndpoint(websocket: WebSocket, room_code: Annotated[str, Path()], user: User = Depends(get_user_from_cookie), session: AsyncSession = Depends(get_async_session)):
    print("WebSocket endpoint reached")
    await manager.connect(user.id, room_code, websocket)
    try:
        while True:
            try:
                data = await websocket.receive_json()
                if data["type"] == "start":
                    #data is {"type": "start", "interval": 60}
                    room_query = select(Room).where(Room.room_code == room_code)
                    room_result = await session.execute(room_query)
                    room = room_result.scalar_one_or_none()

                    if not room:
                        await manager.send_personal_message(websocket, {"type": "error", "message": "Room does not exist"})
                        continue
                    if room.room_status != "Waiting":
                        await manager.send_personal_message(websocket, {"type": "error", "message": "Room not in waiting mode"})
                        continue
                    if room.host_id != user.id:
                        await manager.send_personal_message(websocket, {"type": "error", "message": "You are not the host of this room"})
                        continue
                    
                    room.room_status = "Active"
                    manager.room_states[room_code]["current_index"] = 0
                    manager.room_states[room_code]["status"] = "Active"
                    manager.room_states[room_code]["interval"] = data["interval"]
                    

                    room_question_query = select(RoomQuestion).options(selectinload(RoomQuestion.question_choices)).where(RoomQuestion.room_id == room.room_id).order_by(RoomQuestion.order_in_room)
                    room_question_result = await session.execute(room_question_query)
                    room_questions = room_question_result.scalars().all()
                    manager.room_states[room_code]["questions"] = room_questions

                    if not room_questions:
                        await manager.send_personal_message(websocket, {"type": "error", "message": "No questions found for this room"})
                        continue

                    for rq in room_questions:
                        for choice in rq.question_choices:
                            if choice.is_correct:
                                manager.room_states[room_code]["answers"][rq.room_question_id] = choice.choice_id
                    
                    manager.room_states[room_code]["timer_task"] = asyncio.create_task(QuestionTimer(room_code, manager.room_states[room_code]["interval"], 0))
                    await manager.broadcast(room_code, {"type": "notification", "message": "Game Started"})

                    question_choices = [{"choice_id": str(choice.choice_id), "choice": choice.choice_text, "choice_url": choice.choice_url} for choice in manager.room_states[room_code]["questions"][0].question_choices]
                    await session.commit()
                    manager.room_states[room_code]["answered_users"][0] = set()
                    await manager.broadcast(room_code, {"type": "question",
                                                        "prompt": manager.room_states[room_code]["questions"][0].prompt,
                                                        "prompt_url": manager.room_states[room_code]["questions"][0].prompt_url,
                                                        "choices": question_choices,
                                                        "ends_at": int((time.time() + manager.room_states[room_code]["interval"]) * 1000)})
                #frontend sends dict like {"type": "submit_answer", 
                #                           "answer_choice_id": choice_id, 
                #                           "question_index": index of question that user submits answer for
                #                           }
                elif data["type"] == "submit_answer":
                    current_index = manager.room_states[room_code]["current_index"]
                    if user.id in manager.room_states[room_code]["answered_users"][current_index]: #if user already answered
                        continue
                    submitted_for_index = data["question_index"]
                    if submitted_for_index != current_index:
                        continue
                    manager.room_states[room_code]["answered_users"][current_index].add(user.id)
                    user_answer_id = data["answer_choice_id"]
                    room_question_id = manager.room_states[room_code]["questions"][current_index].room_question_id
                    is_correct = user_answer_id == str(manager.room_states[room_code]["answers"][room_question_id])
                    manager.room_states[room_code]["scores"][str(user.id)]["score"] = manager.room_states[room_code]["scores"][str(user.id)]["score"] + 1 if is_correct else manager.room_states[room_code]["scores"][str(user.id)]["score"]
                    manager.room_states[room_code]["pending_answers"].append({
                        "student_id": user.id,
                        "room_question_id": manager.room_states[room_code]["questions"][current_index].room_question_id,
                        "answer_id": user_answer_id,
                        "is_correct": is_correct
                    })
                        
                    if len(manager.room_states[room_code]["answered_users"][current_index]) >= len(manager.active_connections[room_code].values()):
                        if manager.room_states[room_code]["timer_task"] and manager.room_states[room_code]["timer_task"].done() != True:
                            manager.room_states[room_code]["timer_task"].cancel()
                        asyncio.create_task(ShowRoundResults(room_code, current_index))

                    if len(manager.room_states[room_code]["pending_answers"]) >= 50:
                        try:    
                            pending_answers = [RoomAnswer(
                                student_id = pending.get("student_id"),
                                room_question_id = pending.get("room_question_id"),
                                answer_id = pending.get("answer_id"),
                                is_correct = pending.get("is_correct")
                            ) for pending in manager.room_states[room_code]["pending_answers"]]
                            session.add_all(pending_answers)
                            await session.commit()
                            manager.room_states[room_code]["pending_answers"].clear()
                        except Exception as e:
                            await session.rollback()
                            logger.error(f"Error committing pending answers to DB: {e}", exc_info=True)
            except json.JSONDecodeError:
                await manager.send_personal_message(websocket, {"type": "error", "message": "Invalid JSON"})
                continue
            except WebSocketDisconnect:
                await manager.disconnect(user.id, room_code, websocket)
                await manager.broadcast(room_code, {"type": "notification", "message": f"{user.fname} {user.lname} has left the room"})
                break
            except KeyError as e:
                await manager.send_personal_message(websocket, {"type": "error", "message": f"Missing field: {e}"})
                continue
            except Exception as e:
                logger.error(f"WebSocket error: {e}", exc_info=True)
                await manager.send_personal_message(websocket, {"type": "error", "message": "Internal error"})
                continue
    except Exception as e:
        logger.error(f"WebSocket fatal error: {e}", exc_info=True)