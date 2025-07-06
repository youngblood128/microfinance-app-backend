Sub AnalyzeGLsAndGenerateJEs()
    Dim wsRaw As Worksheet, wsOutput As Worksheet
    Dim lastRow As Long, i As Long, outRow As Long
    Dim glDict As Object, gl As Variant
    Dim avgDict As Object, curAmount As Double
    Dim month As String
    Dim hasJune As Boolean, juneTotal As Double
    Dim avgAmt As Double

    ' Update column numbers
    Const colPeriod As Long = 5      ' Column E ? M.PERIOD
    Const colGL As Long = 10         ' Column J ? G/L ACCOUNT NO.
    Const colAmount As Long = 18     ' Column R ? AMOUNT

    Set glDict = CreateObject("Scripting.Dictionary")
    Set avgDict = CreateObject("Scripting.Dictionary")

    Set wsRaw = ThisWorkbook.Sheets("Paste_Your_Data")
    Set wsOutput = ThisWorkbook.Sheets("JV_Output")

    wsOutput.Range("A2:D1000").ClearContents
    lastRow = wsRaw.Cells(wsRaw.Rows.Count, colGL).End(xlUp).Row

    ' Step 1: Calculate averages from Jan–May
    For i = 2 To lastRow
        month = wsRaw.Cells(i, colPeriod).Value
        gl = wsRaw.Cells(i, colGL).Value

        If month <> "2025-06" And IsNumeric(wsRaw.Cells(i, colAmount).Value) Then
            curAmount = CDbl(wsRaw.Cells(i, colAmount).Value)

            If Not avgDict.exists(gl) Then
                avgDict.Add gl, curAmount
                glDict.Add gl, 1
            Else
                avgDict(gl) = avgDict(gl) + curAmount
                glDict(gl) = glDict(gl) + 1
            End If
        End If
    Next i

    ' Step 2: Check June values and create flags
    outRow = 2
    For Each gl In avgDict.keys
        avgAmt = avgDict(gl) / glDict(gl)
        hasJune = False
        juneTotal = 0

        For i = 2 To lastRow
            If wsRaw.Cells(i, colGL).Value = gl And wsRaw.Cells(i, colPeriod).Value = "2025-06" Then
                If IsNumeric(wsRaw.Cells(i, colAmount).Value) Then
                    hasJune = True
                    juneTotal = juneTotal + CDbl(wsRaw.Cells(i, colAmount).Value)
                End If
            End If
        Next i

        If Not hasJune Then
            wsOutput.Cells(outRow, 1).Value = gl
            wsOutput.Cells(outRow, 2).Value = "ACCRUE"
            wsOutput.Cells(outRow, 3).Value = Round(avgAmt, 2)
            wsOutput.Cells(outRow, 4).Value = "Auto-accrual: Missing June entry"
            outRow = outRow + 1
        ElseIf juneTotal < 0.8 * avgAmt Then
            wsOutput.Cells(outRow, 1).Value = gl
            wsOutput.Cells(outRow, 2).Value = "ACCRUE BALANCE"
            wsOutput.Cells(outRow, 3).Value = Round(avgAmt - juneTotal, 2)
            wsOutput.Cells(outRow, 4).Value = "Auto-accrual: Partial June entry"
            outRow = outRow + 1
        ElseIf juneTotal > 1.5 * avgAmt Then
            wsOutput.Cells(outRow, 1).Value = gl
            wsOutput.Cells(outRow, 2).Value = "REVERSE"
            wsOutput.Cells(outRow, 3).Value = Round(juneTotal - avgAmt, 2)
            wsOutput.Cells(outRow, 4).Value = "Auto-reversal: Overposted June entry"
            outRow = outRow + 1
        End If
    Next gl

    MsgBox "Journal Entries Generated!", vbInformation
End Sub

